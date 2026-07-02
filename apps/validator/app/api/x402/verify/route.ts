import { NextRequest, NextResponse } from 'next/server';
import { verifyAttestation, type VerificationRequest } from '../../../lib/validator-engine';

export async function POST(req: NextRequest) {
  try {
    const body: VerificationRequest = await req.json();
    const result = verifyAttestation(body);

    return NextResponse.json({
      sessionId: `val_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      valid: result.valid,
      schemaValid: result.schemaValid,
      attestorValid: result.attestorValid,
      dataValid: result.dataValid,
      score: result.score,
      proofChain: result.proofChain,
      errors: result.errors,
    });
  } catch (e) {
    return NextResponse.json(
      { error: 'VERIFICATION_FAILED', detail: (e as Error).message },
      { status: 402 }
    );
  }
}
