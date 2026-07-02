// 🦅 Sigil NLU Engine
//
// Natural Language Understanding for Sigil.
// Takes a user's natural language legal request and decomposes it into
// a sequence of x402 operations to execute.
//
// Uses Venice AI (privacy-first, no data retention).
//
// Example:
//   Input: "witness this contract for me"
//   Output: [{ operation: "witness", params: { documentHash: "0x..." } }]
//
//   Input: "help me review this loan document for compliance issues"
//   Output: [
//     { operation: "analyze", params: { documentHash: "0x..." } },
//     { operation: "compliance", params: { documentHash: "0x..." } }
//   ]

import { getLlmConfig } from './llm';
import {
  SIGIL_OPERATIONS, SIGIL_PRICING, SIGIL_OPERATION_DESCRIPTIONS,
  SIGIL_ENDPOINTS,
} from './sigil-types';

// ---------------------------------------------------------------------------
// LLM response type
// ---------------------------------------------------------------------------

interface LlmResponse {
  content: string;
  model: string;
  provider: string;
  processingTimeMs: number;
}

// ---------------------------------------------------------------------------
// Complete helper — uses Sigil's multi-provider LLM config
// ---------------------------------------------------------------------------

async function complete(system: string, user: string): Promise<LlmResponse> {
  const config = getLlmConfig();
  if (config.provider === 'none') {
    throw new Error(`LLM_NOT_CONFIGURED: ${config.reason || 'No API key set. Set VENICE_API_KEY, GEMINI_API_KEY, OPENROUTER_API_KEY, GROQ_API_KEY, or OPENAI_API_KEY.'}`);
  }

  const start = Date.now();
  const res = await fetch(`${config.apiUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.apiKey}`,
      ...config.headers,
    },
    body: JSON.stringify({
      model: config.model,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      temperature: 0.1,
      max_tokens: 2000,
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`LLM error ${res.status}: ${body.slice(0, 200)}`);
  }

  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };

  return {
    content: data.choices?.[0]?.message?.content || '',
    model: config.model,
    provider: config.provider,
    processingTimeMs: Date.now() - start,
  };
}

// ---------------------------------------------------------------------------
// Sigil Operation Catalog
// ---------------------------------------------------------------------------

const SIGIL_OPERATION_CATALOG = SIGIL_OPERATIONS.map((op) => ({
  name: op,
  price: SIGIL_PRICING[op],
  description: SIGIL_OPERATION_DESCRIPTIONS[op],
}));

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type SigilOperation = import('./sigil-types').SigilOperation;

export interface PlannedOperation {
  operation: SigilOperation;
  params: Record<string, unknown>;
  endpoint: string;
  naturalLanguage: string;
}

export interface NLUResult {
  success: boolean;
  plan: PlannedOperation[];
  summary: string;
  error?: string;
}

// ---------------------------------------------------------------------------
// NLU prompt
// ---------------------------------------------------------------------------

const NLU_SYSTEM = `You are Sigil's NLU engine. You convert natural language legal requests into structured operation plans.

Available operations:
${SIGIL_OPERATION_CATALOG.map((op) => `  ${op.name}: "${op.description}" $${op.price}`).join('\n')}

Rules:
1. Return ONLY a JSON object. No markdown, no explanation, no code fences.
2. Response format: { "plan": [...], "summary": "one-line summary" }
3. Each plan item: { "operation": "op_name", "params": {...}, "naturalLanguage": "what this does" }
4. Operations are called via x402. Include document hashes, wallet addresses, amounts where available.
5. Break complex requests into multiple operations in order.
6. For "witness" operations, generate a document hash if none provided using the document description.
7. For "escrow" operations, require at minimum an amount. Default to $500 if unspecified.
8. For document review: analyze first, then compliance if regulatory concerns are mentioned.
9. If the request is ambiguous or impossible, return: { "error": "explanation" }
10. Sigil speaks to notaries, loan officers, lawyers, business owners, and regular people. Be clear and practical.`;

// Endpoint map — from centralized sigil-types.ts
const ENDPOINTS = SIGIL_ENDPOINTS;

// ---------------------------------------------------------------------------
// Parse NLU
// ---------------------------------------------------------------------------

/**
 * Parse a natural language request into a structured operation plan.
 * Uses Venice AI via the LLM client (privacy-first).
 *
 * @param request - The user's natural language request
 * @returns A plan of operations to execute
 */
export async function parseLegalRequest(request: string): Promise<NLUResult> {
  if (!request || request.trim().length === 0) {
    return { success: false, plan: [], summary: '', error: 'Empty request' };
  }

  try {
    const response = await complete(NLU_SYSTEM, request.trim());

    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(response.content);
    } catch {
      const jsonMatch = response.content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        return {
          success: false,
          plan: [],
          summary: '',
          error: `Failed to parse LLM response: ${response.content.slice(0, 200)}`,
        };
      }
      parsed = JSON.parse(jsonMatch[0]);
    }

    if (parsed.error) {
      return {
        success: false,
        plan: [],
        summary: '',
        error: String(parsed.error),
      };
    }

    const planData = parsed.plan;
    if (!Array.isArray(planData)) {
      return {
        success: false,
        plan: [],
        summary: '',
        error: 'LLM returned invalid plan format',
      };
    }

    const plan: PlannedOperation[] = planData.map((item: Record<string, unknown>) => {
      const opName = item.operation as SigilOperation;
      return {
        operation: opName,
        params: (item.params as Record<string, unknown>) || {},
        endpoint: ENDPOINTS[opName] || `/api/x402/${opName}`,
        naturalLanguage: (item.naturalLanguage as string) || '',
      };
    });

    return {
      success: true,
      plan,
      summary: (parsed.summary as string) || `Sigil plan with ${plan.length} steps`,
    };
  } catch (err) {
    return {
      success: false,
      plan: [],
      summary: '',
      error: `NLU error: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}
