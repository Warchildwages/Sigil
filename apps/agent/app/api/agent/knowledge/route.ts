import { NextResponse } from 'next/server';
import { synthesizeLegalKnowledge } from '@/lib/legal-knowledge.js';
import type { LegalKnowledgeResponse } from '@signet/shared';

/**
 * POST /api/agent/knowledge
 *
 * Free-tier legal knowledge Q&A endpoint.
 * Rate-limited: 10 requests per minute per IP (anon), 30/min authenticated.
 * Always includes mandatory disclaimer.
 *
 * Phase 3 — Legal Clarity Agent for Circle Marketplace.
 */
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const query = typeof body.query === 'string' ? body.query : '';
    const jurisdiction = typeof body.jurisdiction === 'string' ? body.jurisdiction : undefined;
    const entityType = typeof body.entityType === 'string' ? body.entityType : undefined;

    if (!query) {
      return NextResponse.json(
        { error: 'Validation failed', details: { fieldErrors: { query: ['Required'] } } },
        { status: 400 },
      );
    }

    if (query.length > 2000) {
      return NextResponse.json(
        { error: 'Query too long. Maximum 2000 characters.' },
        { status: 400 },
      );
    }

    const response: LegalKnowledgeResponse = await synthesizeLegalKnowledge({
      query,
      jurisdiction,
      entityType: entityType as LegalKnowledgeResponse['areas'] extends Array<infer _> ? 'individual' | 'business' | 'notary' | 'government' | 'startup' | undefined : never,
    });

    return NextResponse.json(response);
  } catch (error) {
    console.error('POST /api/agent/knowledge error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}