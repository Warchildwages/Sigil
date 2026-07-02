import { verifyDocumentCompleteness } from '@/app/api/analyze/completeness.js';
import { getLlmConfig } from '@/lib/llm.js';
import type {
  AgentAnalysisResponse,
  AgentContextHint,
  BenchmarkComparison,
  RiskAssessment,
} from '@sigil/shared';
import { NextResponse } from 'next/server';
import {
  detectDocumentContext,
  detectPersona,
  getComplexityLabel,
  scoreComplexity,
} from './detector.js';
import { buildComprehensivePrompt, buildRiskPrompt } from './prompts.js';

type RiskLevel = 'low' | 'moderate' | 'high' | 'critical';

interface ClauseFinding {
  clause: string;
  concern: string;
  recommendation: string;
  risk: RiskLevel;
}

interface RawLLMFinding {
  category?: string;
  clause: string;
  concern: string;
  recommendation: string;
  risk: string;
}

interface RawLLMResponse {
  findings: RawLLMFinding[];
  recommendation: string;
}

/**
 * POST /api/agent/analyze
 *
 * Legal agent analysis endpoint. Auto-detects document context internally,
 * builds a comprehensive multi-angle prompt, and calls the LLM.
 * Returns AgentAnalysisResponse with autoDetectedContext, findings, and metadata.
 */
export async function POST(request: Request) {
  const startTime = Date.now();

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const documentText = typeof body.documentText === 'string' ? body.documentText : '';
    const contextHint = (body.contextHint as AgentContextHint) ?? undefined;

    if (!documentText) {
      return NextResponse.json(
        { error: 'Validation failed', details: { fieldErrors: { documentText: ['Required'] } } },
        { status: 400 },
      );
    }

    // Trim to ~12k chars for LLM context window
    const trimmedText = documentText.slice(0, 12000);

    // ── Step 1: Auto-detect document context ──
    const detectedContext = detectDocumentContext(trimmedText);

    // ── Step 1.5: Complexity scoring (inlined from @sigil/agent-core) ──
    // Count seed text matches from the detector's keyword signals as a proxy
    const seedMatchCount = [].length; // detector uses keyword hits internally
    const complexityScore = scoreComplexity({
      documentType: detectedContext,
      textLength: trimmedText.length,
      seedTextMatchCount: seedMatchCount,
    });
    const complexityLabel = getComplexityLabel(complexityScore);

    // ── Step 1.6: Persona detection (inlined from @sigil/agent-core) ──
    const personas = detectPersona(trimmedText);

    // ── Step 2: Build comprehensive prompt ──
    const prompt = buildComprehensivePrompt(trimmedText, detectedContext, contextHint);

    // ── Step 3: Completeness check (always runs) ──
    const completeness = verifyDocumentCompleteness(trimmedText);

    // ── Step 4: Call LLM (centralized provider) ──
    const llm = getLlmConfig();
    const modelUsed = llm.model;
    let llmResult: {
      findings: ClauseFinding[];
      recommendation: 'sign' | 'review' | 'reject';
    } | null = null;

    if (llm.provider !== 'none') {
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
              {
                role: 'system',
                content: 'You are a legal document analyzer. Return ONLY valid JSON.',
              },
              { role: 'user', content: prompt },
            ],
            temperature: 0.3,
            max_tokens: 2000,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          const content = data.choices?.[0]?.message?.content;
          if (content) {
            const parsed = JSON.parse(content) as RawLLMResponse;
            const riskOrder: RiskLevel[] = ['low', 'moderate', 'high', 'critical'];
            const findings: ClauseFinding[] = (parsed.findings || []).map((f) => ({
              clause: String(f.clause || 'Unknown Clause'),
              concern: String(f.concern || ''),
              recommendation: String(f.recommendation || ''),
              risk: (riskOrder.includes(f.risk as RiskLevel) ? f.risk : 'moderate') as RiskLevel,
            }));

            llmResult = {
              findings,
              recommendation: ['sign', 'review', 'reject'].includes(parsed.recommendation as string)
                ? (parsed.recommendation as 'sign' | 'review' | 'reject')
                : 'review',
            };
          }
        } else {
          console.error(`${llm.provider} API error:`, res.status);
        }
      } catch (err) {
        console.error('LLM call error:', err);
      }
    }

    // ── Step 5: Risk assessment (consumer-facing, Phase 2.5 — /review) ──
    let riskAssessment: RiskAssessment | undefined;
    if (llm.provider !== 'none') {
      const riskPrompt = buildRiskPrompt(trimmedText, detectedContext);

      try {
        const riskRes = await fetch(llm.apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${llm.apiKey}`,
            ...llm.headers,
          },
          body: JSON.stringify({
            model: llm.model,
            messages: [
              {
                role: 'system',
                content: 'You are a consumer document reviewer. Return ONLY valid JSON.',
              },
              { role: 'user', content: riskPrompt },
            ],
            temperature: 0.3,
            max_tokens: 1500,
          }),
        });

        if (riskRes.ok) {
          const riskData = await riskRes.json();
          const riskContent = riskData.choices?.[0]?.message?.content;
          if (riskContent) {
            const parsed = JSON.parse(riskContent);
            riskAssessment = {
              riskLevel: ['high', 'moderate', 'low'].includes(parsed.riskLevel)
                ? parsed.riskLevel
                : 'moderate',
              score:
                typeof parsed.score === 'number' ? Math.max(0, Math.min(100, parsed.score)) : 50,
              documentType: String(parsed.documentType || detectedContext),
              summary: String(parsed.summary || ''),
              issues: Array.isArray(parsed.issues) ? parsed.issues : [],
              benchmarks: Array.isArray(parsed.benchmarks)
                ? parsed.benchmarks.map((b: Record<string, unknown>) => ({
                    label: String(b.label || ''),
                    standard: String(b.standard || ''),
                    yours: String(b.yours || ''),
                    assessment: ['above', 'at', 'below'].includes(String(b.assessment))
                      ? (String(b.assessment) as BenchmarkComparison['assessment'])
                      : 'at',
                  }))
                : undefined,
            };
          }
        }
      } catch (err) {
        console.error('Risk assessment LLM error:', err);
      }
    }

    // ── Step 6: Assemble response ──
    const processingTimeMs = Date.now() - startTime;

    const findings = llmResult?.findings ?? [];
    const recommendation = llmResult?.recommendation ?? 'review';

    const riskOrder: RiskLevel[] = ['low', 'moderate', 'high', 'critical'];
    const maxRiskIndex =
      findings.length > 0 ? Math.max(...findings.map((f) => riskOrder.indexOf(f.risk))) : 0;
    const overallRisk: RiskLevel = riskOrder[maxRiskIndex]!;

    const response: AgentAnalysisResponse = {
      analysisId: `agent-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
      autoDetectedContext: detectedContext,
      overallRisk,
      findings,
      recommendation,
      completeness,
      risk: riskAssessment,
      complexity: { score: complexityScore, label: complexityLabel },
      personas,
      generatedAt: new Date().toISOString(),
      modelUsed,
      processingTimeMs,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('POST /api/agent/analyze error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
