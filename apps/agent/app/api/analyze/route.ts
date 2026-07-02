import { NextResponse } from 'next/server';
import { getLlmConfig } from '@/lib/llm.js';
import { getFallbackAnalysis } from './fallback.js';
import { verifyDocumentCompleteness } from './completeness.js';

type RiskLevel = 'low' | 'moderate' | 'high' | 'critical';

interface ClauseFinding {
  clause: string;
  concern: string;
  recommendation: string;
  risk: RiskLevel;
}

interface AnalyzeResult {
  overallRisk: RiskLevel;
  findings: ClauseFinding[];
  recommendation: 'sign' | 'review' | 'reject';
}

/** Extract text from a buffer based on MIME type */
async function extractText(buffer: Buffer, mimeType: string): Promise<string> {
  if (mimeType === 'application/pdf' || mimeType === 'pdf') {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const pdfParse = require('pdf-parse') as (buf: Buffer) => Promise<{ text: string }>;
      const data = await pdfParse(buffer);
      return data.text.slice(0, 12000);
    } catch {
      return '';
    }
  }

  if (
    mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    || mimeType === 'application/msword'
    || mimeType === 'docx'
  ) {
    try {
      const mammoth = await import('mammoth');
      const result = await mammoth.extractRawText({ buffer });
      return result.value.slice(0, 12000);
    } catch {
      return '';
    }
  }

  // Plain text or unknown — treat as UTF-8
  try {
    return Buffer.from(buffer).toString('utf-8').slice(0, 12000);
  } catch {
    return '';
  }
}

/** Call LLM to analyze the document text via centralized provider config */
async function callLLM(documentText: string): Promise<AnalyzeResult | null> {
  const llm = getLlmConfig();
  if (llm.provider === 'none') return null;

  const prompt = `You are a legal document analysis assistant. Analyze the following document text and produce a clause-by-clause risk assessment. Return ONLY valid JSON with this exact structure:

{
  "findings": [
    {
      "clause": "Name of the clause or section",
      "concern": "What the concern is, in plain English",
      "recommendation": "What action to take",
      "risk": "low" | "moderate" | "high" | "critical"
    }
  ],
  "recommendation": "sign" | "review" | "reject"
}

Risk levels: low=standard language, no issues. moderate=minor concerns worth negotiating. high=significant risk, negotiate or modify. critical=do not sign without major changes.

Recommendations: sign=safe to sign as-is. review=review these clauses before signing. reject=critical issues that must be addressed first.

Focus on: obligations, liability, indemnification, intellectual property, confidentiality, termination, dispute resolution, governing law, warranties, payment terms, force majeure.

Document text:
${documentText}`;

  try {
    const res = await fetch(llm.apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${llm.apiKey}`,
        ...llm.headers,
      },
      body: JSON.stringify({
        model: llm.model,
        messages: [
          { role: 'system', content: 'You are a legal document analyzer. Return only valid JSON.' },
          { role: 'user', content: prompt },
        ],
        temperature: 0.3,
        max_tokens: 2000,
      }),
    });

    if (!res.ok) {
      console.error(`${llm.provider} API error:`, res.status, await res.text());
      return null;
    }

    const data = await res.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) return null;

    // Parse the JSON response
    const parsed = JSON.parse(content);
    const riskOrder: RiskLevel[] = ['low', 'moderate', 'high', 'critical'];
    const findings: ClauseFinding[] = parsed.findings.map((f: Record<string, unknown>) => ({
      clause: String(f.clause || 'Unknown Clause'),
      concern: String(f.concern || ''),
      recommendation: String(f.recommendation || ''),
      risk: riskOrder.includes(f.risk as RiskLevel) ? f.risk : 'moderate',
    }));

    const maxRiskIndex = Math.max(...findings.map((f) => riskOrder.indexOf(f.risk)));
    const overallRisk = riskOrder[maxRiskIndex]!;

    return {
      overallRisk,
      findings,
      recommendation: ['sign', 'review', 'reject'].includes(parsed.recommendation as string)
        ? parsed.recommendation
        : 'review',
    };
  } catch (err) {
    console.error('LLM analysis error:', err);
    return null;
  }
}

export async function POST(request: Request) {
  try {
    const contentType = request.headers.get('content-type') || '';
    let contentHash: string | null = null;
    let fileName: string | undefined;
    let mimeType: string | undefined;
    let fileBuffer: Buffer | undefined;

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      const file = formData.get('file');
      contentHash = formData.get('contentHash') as string;
      fileName = formData.get('fileName') as string | undefined;
      mimeType = formData.get('mimeType') as string | undefined;

      if (file && file instanceof Blob) {
        fileBuffer = Buffer.from(await file.arrayBuffer());
      }
    } else {
      // JSON body (backward compatible — no file)
      const body = (await request.json()) as Record<string, unknown>;
      contentHash = typeof body.contentHash === 'string' ? body.contentHash : null;
      fileName = typeof body.fileName === 'string' ? body.fileName : undefined;
      mimeType = typeof body.mimeType === 'string' ? body.mimeType : undefined;
    }

    if (!contentHash) {
      return NextResponse.json(
        { error: 'Validation failed', details: { fieldErrors: { contentHash: ['Required'] } } },
        { status: 400 },
      );
    }

    // Normalize hash format: add 0x prefix if missing (demo-friendly)
    if (!contentHash.startsWith('0x')) {
      contentHash = '0x' + contentHash;
    }

    // ── Document completeness check (always runs when we have file content) ──
    let completeness = null;
    if (fileBuffer && fileBuffer.length > 0) {
      const extractedText = await extractText(fileBuffer, mimeType || 'application/octet-stream');
      if (extractedText) {
        completeness = verifyDocumentCompleteness(extractedText, fileName);
      }
    }

    // ── Try real LLM analysis if we have a file and API key ──
    if (fileBuffer && fileBuffer.length > 0) {
      const extractedText = await extractText(fileBuffer, mimeType || 'application/octet-stream');
      if (extractedText) {
        const llmResult = await callLLM(extractedText);
        if (llmResult) {
          return NextResponse.json({
            ...llmResult,
            completeness,
          });
        }
      }
    }

    // ── Fallback: deterministic analysis (no file or no API key) ──
    const fallbackResult = getFallbackAnalysis(contentHash);

    return NextResponse.json({
      ...fallbackResult,
      completeness,
    });
  } catch (error) {
    console.error('POST /api/analyze error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}