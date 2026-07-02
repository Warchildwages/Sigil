import { z } from 'zod';
import { NextResponse } from 'next/server';
import type { LegalKnowledgeResponse } from '@signet/shared';
import { synthesizeLegalKnowledge } from '@/lib/legal-knowledge.js';

/**
 * POST /api/x402/knowledge
 *
 * x402-paid legal knowledge Q&A.
 * Validates X-Payment-Id, accepts structured query parameters.
 */

const knowledgeSchema = z.object({
  query: z.string().min(1, 'Query is required').max(2000, 'Query max 2000 characters'),
  jurisdiction: z.string().max(100).optional(),
  entityType: z.enum(['individual', 'business', 'notary', 'government', 'startup']).optional(),
});

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

  try {
    const body = await request.json();
    const parsed = knowledgeSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { query, jurisdiction, entityType } = parsed.data;

    const response: LegalKnowledgeResponse = await synthesizeLegalKnowledge({
      query,
      jurisdiction,
      entityType,
    });

    return NextResponse.json(response, {
      headers: {
        'X-Payment-Required': 'false',
        'X-Service-Id': 'sigil-v1',
      },
    });
  } catch (err) {
    console.error('POST /api/x402/knowledge error:', err);
    return NextResponse.json(
      { error: 'Internal server error', code: 'KNOWLEDGE_FAILED' },
      { status: 500 },
    );
  }
}