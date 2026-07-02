/**
 * POST /api/chat
 *
 * Sigil's natural language interface.
 * Users (notaries, loan officers, lawyers, business owners) talk to Sigil
 * in plain English. Sigil parses intent, presents an operation plan,
 * and executes on approval.
 */

import { NextResponse } from 'next/server';
import { parseLegalRequest } from '@/lib/sigil-nlu';
import type { PlannedOperation, SigilOperation } from '@/lib/sigil-nlu';

/**
 * POST /api/chat
 *
 * Accepts a natural language legal request and returns an operation plan.
 * The caller then confirms and each operation is executed via its x402 endpoint.
 */
export async function POST(request: Request) {
  let body: { message?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body', plan: [] }, { status: 400 });
  }

  const message = body.message?.trim();
  if (!message) {
    return NextResponse.json({ error: 'Message is required', plan: [] }, { status: 400 });
  }

  try {
    const result = await parseLegalRequest(message);

    if (!result.success) {
      return NextResponse.json({
        error: result.error || 'Could not understand the request',
        plan: [],
        summary: '',
      }, { status: 400 });
    }

    const totalCost = result.plan.reduce(
      (sum: number, op: PlannedOperation) => {
        const prices: Record<string, number> = {
          witness: 0.03, escrow: 0.05, dispute: 0.04, compliance: 0.03,
          milestone: 0.01, oracle: 0.05, reputation: 0.03,
          timestamp: 0.01, translate: 0.03, analyze: 0.02, knowledge: 0.01,
        };
        return sum + (prices[op.operation] || 0);
      }, 0,
    );

    return NextResponse.json({
      success: true,
      summary: result.summary,
      plan: result.plan.map((op: PlannedOperation) => ({
        operation: op.operation,
        endpoint: op.endpoint,
        naturalLanguage: op.naturalLanguage,
        params: op.params,
        price: op.operation === 'witness' ? 0.03
          : op.operation === 'escrow' ? 0.05
          : op.operation === 'dispute' ? 0.04
          : op.operation === 'compliance' ? 0.03
          : op.operation === 'milestone' ? 0.01
          : op.operation === 'oracle' ? 0.05
          : op.operation === 'reputation' ? 0.03
          : op.operation === 'timestamp' ? 0.01
          : op.operation === 'translate' ? 0.03
          : op.operation === 'analyze' ? 0.02
          : 0.01,
      })),
      totalCost,
      note: 'Review the plan above. Each operation requires x402 payment. Call the endpoint directly with the payment header to execute.',
    }, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'no-store',
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({
      error: message,
      plan: [],
      summary: '',
      providerHint: message.includes('LLM') ? 'Set VENICE_API_KEY, GEMINI_API_KEY, or another LLM provider in env.' : undefined,
    }, { status: 500 });
  }
}

/**
 * GET /api/chat
 *
 * Returns Sigil's operation catalog — what she can do and at what prices.
 */
export async function GET() {
  return NextResponse.json({
    name: 'Sigil — Legal Clarity Agent',
    description: 'I help notaries manage their journals, loan officers review documents, and businesses get legal clarity. Tell me what you need in plain English.',
    operations: [
      { name: 'witness', description: 'Witness a document or event. On-chain proof of existence.', price: 0.03 },
      { name: 'escrow', description: 'Deposit, hold, and release funds when conditions are met.', price: 0.05 },
      { name: 'dispute', description: 'Open a dispute on an escrow with evidence submission.', price: 0.04 },
      { name: 'compliance', description: 'Regulatory compliance check (SOC 2, HIPAA, KYC, AML, GDPR).', price: 0.03 },
      { name: 'milestone', description: 'Verify milestone completion with proof.', price: 0.01 },
      { name: 'oracle', description: 'Query deadlines, dates, or market data with notarized answers.', price: 0.05 },
      { name: 'reputation', description: 'Look up an agent or entity reputation score.', price: 0.03 },
      { name: 'timestamp', description: 'Timestamp a document hash on-chain.', price: 0.01 },
      { name: 'translate', description: 'Verify legal document translation accuracy.', price: 0.03 },
      { name: 'analyze', description: 'Legal document analysis — clauses, obligations, risks.', price: 0.02 },
      { name: 'knowledge', description: 'Query legal knowledge base.', price: 0.01 },
    ],
    example: 'Try: "Witness this contract for me" or "Help me review this loan document for compliance"',
  }, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'public, max-age=300',
    },
  });
}
