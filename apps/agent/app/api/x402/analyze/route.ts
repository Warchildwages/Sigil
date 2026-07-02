import { NextResponse } from 'next/server';
import type { AgentAnalysisResponse } from '@signet/shared';

/**
 * POST /api/x402/analyze
 *
 * x402-paid document analysis.
 * Validates X-Payment-Id, delegates directly to analysis pipeline.
 */
export async function POST(request: Request) {
  const paymentId = request.headers.get('X-Payment-Id');

  if (!paymentId) {
    return NextResponse.json(
      {
        error: 'Payment required',
        code: 'PAYMENT_REQUIRED',
        details: 'X-Payment-Id header is required. Pay via Circle Gateway.',
        paymentEndpoint: 'https://signet.ventures/api/x402/service-info',
        service: 'sigil-v1',
      },
      {
        status: 402,
        headers: { 'X-Payment-Required': 'true', 'X-Service-Id': 'sigil-v1' },
      },
    );
  }

  // Validate body
  let body: { documentId?: string; content?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON body', code: 'INVALID_JSON' },
      { status: 400, headers: { 'X-Service-Id': 'sigil-v1' } },
    );
  }

  if (!body.documentId && !body.content) {
    return NextResponse.json(
      { error: 'documentId or content required', code: 'MISSING_FIELDS' },
      { status: 400, headers: { 'X-Service-Id': 'sigil-v1' } },
    );
  }

  console.log(`[x402] analyze: payment=${paymentId} doc=${body.documentId || 'inline'}`);

  try {
    // Delegate to the existing agent analyze pipeline via internal call
    const internalUrl = new URL('/api/agent/analyze', request.url);
    const internalRes = await fetch(internalUrl.toString(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!internalRes.ok) {
      const error = await internalRes.text();
      return NextResponse.json(
        { error: 'Analysis failed', details: error },
        { status: internalRes.status, headers: { 'X-Service-Id': 'sigil-v1' } },
      );
    }

    const data = (await internalRes.json()) as Record<string, unknown>;
    return NextResponse.json(data, {
      headers: { 'X-Payment-Required': 'false', 'X-Service-Id': 'sigil-v1' },
    });
  } catch (err) {
    console.error('[x402] analyze error:', err);
    return NextResponse.json(
      { error: 'Internal server error', code: 'ANALYSIS_FAILED' },
      { status: 500, headers: { 'X-Service-Id': 'sigil-v1' } },
    );
  }
}
