import { NextRequest, NextResponse } from 'next/server';
import { validateProofChain, type ChainValidationRequest } from '../../../lib/validator-engine';

export async function POST(req: NextRequest) {
  try {
    const body: ChainValidationRequest = await req.json();
    const result = validateProofChain(body);

    return NextResponse.json({
      sessionId: `val_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      root: result.root,
      nodes: result.nodes,
      valid: result.valid,
      brokenLinks: result.brokenLinks,
      confidence: result.valid ? 'high' : 'low',
    });
  } catch (e) {
    return NextResponse.json(
      { error: 'PROOF_FAILED', detail: (e as Error).message },
      { status: 402 }
    );
  }
}
