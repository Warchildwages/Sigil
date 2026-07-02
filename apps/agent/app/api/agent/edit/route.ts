import { NextResponse } from 'next/server';
import { getLlmConfig } from '@/lib/llm.js';

/**
 * POST /api/agent/edit
 *
 * AI-driven document clause editing. Accepts a plain-English instruction
 * and returns a modified clause with explanation.
 *
 * Body: { documentText: string, instruction: string, contractModel?: ContractModel, targetClause?: string }
 * Returns: { newClause: string, explanation: string, resolvesIssue: boolean }
 *
 * Phase 2.5 — /review consumer document analysis service.
 */
export async function POST(request: Request) {
  const startTime = Date.now();

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const documentText = typeof body.documentText === 'string' ? body.documentText : '';
    const instruction = typeof body.instruction === 'string' ? body.instruction : '';
    const targetClause = typeof body.targetClause === 'string' ? body.targetClause : undefined;

    if (!documentText || !instruction) {
      return NextResponse.json(
        { error: 'Validation failed', details: { fieldErrors: { documentText: ['Required'], instruction: ['Required'] } } },
        { status: 400 },
      );
    }

    const trimmedText = documentText.slice(0, 6000);
    const prompt = buildEditPrompt(trimmedText, instruction, targetClause);

    const llm = getLlmConfig();
    if (llm.provider === 'none') {
      return NextResponse.json(
        { error: 'LLM not configured. Set GROQ_API_KEY or OPENAI_API_KEY.' },
        { status: 503 },
      );
    }

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
          { role: 'system', content: 'You are a legal document editor. Return ONLY valid JSON. No explanations outside the JSON.' },
          { role: 'user', content: prompt },
        ],
        temperature: 0.3,
        max_tokens: 800,
      }),
    });

    if (!res.ok) {
      console.error(`${llm.provider} edit API error:`, res.status);
      return NextResponse.json({ error: 'LLM edit failed' }, { status: 502 });
    }

    const data = await res.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      return NextResponse.json({ error: 'Empty LLM response' }, { status: 502 });
    }

    const parsed = JSON.parse(content) as Record<string, unknown>;

    const result = {
      newClause: String(parsed.newClause || ''),
      explanation: String(parsed.explanation || 'Clause modified per request.'),
      resolvesIssue: parsed.resolvesIssue === true,
      modelUsed: llm.model,
      processingTimeMs: Date.now() - startTime,
    };

    return NextResponse.json(result);
  } catch (err) {
    console.error('POST /api/agent/edit error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

function buildEditPrompt(documentText: string, instruction: string, targetClause?: string): string {
  const targetLine = targetClause ? `\nThe clause to modify is: "${targetClause}"\n` : '';

  return `You are a legal document editor. Given a document and a plain-English instruction, rewrite the relevant clause.

${targetLine}
Instruction: "${instruction}"

Return ONLY valid JSON with this structure:
{
  "newClause": "The rewritten clause text",
  "explanation": "One sentence explaining what changed",
  "resolvesIssue": true or false
}

Rules:
- Write the clause in clear, standard legal language
- Match the original document's tone and terminology
- If the instruction asks for industry-standard terms, use the standards: NDA term = 2-3 years, mutual obligations are standard, independent development should be carved out
- If the instruction cannot be applied to any clause in the document, set resolvesIssue to false and explain why
- Never invent terms that are unrelated to the instruction

Document text:
${documentText}`;
}