import crypto from 'node:crypto';
import { paymentRequiredResponse, verifyPaymentHeader } from '@/lib/x402-payment';
import { reputationRequestSchema } from '@/lib/x402-schemas';
import type { ReputationResponse } from '@sigil/shared';
import { NextResponse } from 'next/server';
import { fireCasperAttestation } from '@/lib/casper-attest-helper';

const REPUTATION_PRICE = 0.03;

function sha256(data: string): string {
  return `0x${crypto.createHash('sha256').update(data).digest('hex')}`;
}

function generateId(): string {
  return `rep_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function getReputation(
  agentId: string,
): Omit<ReputationResponse, 'reputationId' | 'attestationUid' | 'generatedAt'> {
  if (agentId === 'sigil-v1') {
    return {
      agentId,
      completedAgreements: 842,
      totalDisputes: 12,
      disputeRate: 0.014,
      avgResolutionHours: 3.2,
      tier: 'trusted',
    };
  }
  return {
    agentId,
    completedAgreements: 47,
    totalDisputes: 3,
    disputeRate: 0.064,
    avgResolutionHours: 8.5,
    tier: 'verified',
  };
}

export async function POST(request: Request) {
  const paymentCheck = verifyPaymentHeader(request.headers, 'reputation', REPUTATION_PRICE);
  if (!paymentCheck.valid) {
    return paymentRequiredResponse('reputation', REPUTATION_PRICE, paymentCheck.reason);
  }

  let body: { agentId: string };
  try {
    const payload = await request.json();
    const parsed = reputationRequestSchema.safeParse(payload);
    if (!parsed.success) {
      const errors = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
      return NextResponse.json({ error: 'Validation failed', details: errors }, { status: 400 });
    }
    body = parsed.data;
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const reputationId = generateId();
  const now = new Date().toISOString();
  const base = getReputation(body.agentId);
  const attestationUid = sha256(
    `reputation:${reputationId}:${body.agentId}:${base.tier}:${base.disputeRate}:${now}`,
  );

  try {
    const db = await import('@sigil/db');
    const { prisma } = db;
    await prisma.reputationRecord?.create({
      data: {
        ...base,
        reputationId,
        attestationUid,
        paymentId: paymentCheck.paymentId,
        generatedAt: new Date(),
      },
    });
  } catch {
    /* non-blocking */
  }

  console.log(`[x402 reputation] ${reputationId}, agent: ${body.agentId}, tier: ${base.tier}`);

  const response: ReputationResponse = { reputationId, attestationUid, generatedAt: now, ...base };
  fireCasperAttestation({
    operation: 'reputation', amount: REPUTATION_PRICE, witnessId: reputationId,
    payload: { reputationId, agentId: body.agentId, tier: base.tier },
  });
  return NextResponse.json(response, {
    headers: {
      'X-Payment-Required': 'false',
      'X-Service-Id': 'sigil-v1',
      'Cache-Control': 'no-store',
    },
  });
}
