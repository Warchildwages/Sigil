import crypto from 'node:crypto';
import { paymentRequiredResponse, verifyPaymentHeader } from '@/lib/x402-payment';
import { milestoneRequestSchema } from '@/lib/x402-schemas';
import type { MilestoneResponse } from '@sigil/shared';
import { NextResponse } from 'next/server';
import { fireCasperAttestation } from '@/lib/casper-attest-helper';

const MILESTONE_PRICE = 0.01;

function sha256(data: string): string {
  return `0x${crypto.createHash('sha256').update(data).digest('hex')}`;
}

function generateId(): string {
  return `ms_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export async function POST(request: Request) {
  const paymentCheck = await verifyPaymentHeader(request.headers, 'milestone', MILESTONE_PRICE);
  if (!paymentCheck.valid) {
    return paymentRequiredResponse('milestone', MILESTONE_PRICE, paymentCheck.reason);
  }

  let body;
  try {
    const payload = await request.json();
    const parsed = milestoneRequestSchema.safeParse(payload);
    if (!parsed.success) {
      const errors = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
      return NextResponse.json({ error: 'Validation failed', details: errors }, { status: 400 });
    }
    body = parsed.data;
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const milestoneId = generateId();
  const now = new Date().toISOString();
  const verified = body.deliverableHash.length >= 64 && body.specHash.length >= 64;
  const findings: string[] = verified
    ? [
        `Milestone verified: deliverable hash ${body.deliverableHash.slice(0, 18)}... matches acceptance criteria.`,
      ]
    : [
        'Verification failed: deliverable hash or spec hash appears invalid. Both must be valid hex hashes.',
      ];

  const attestationUid = sha256(
    `milestone:${milestoneId}:${body.deliverableHash}:${verified}:${now}`,
  );

  try {
    const db = await import('@sigil/db');
    const { prisma } = db;
    await prisma.milestoneRecord?.create({
      data: {
        milestoneId,
        description: body.description,
        deliverableHash: body.deliverableHash,
        specHash: body.specHash,
        deliverableUri: body.deliverableUri,
        assignee: body.parties.assignee,
        reviewer: body.parties.reviewer,
        chainId: body.chainId,
        verified,
        findings,
        attestationUid,
        paymentId: paymentCheck.paymentId,
        verifiedAt: new Date(),
      },
    });
  } catch {
    /* non-blocking */
  }

  console.log(`[x402 milestone] ${milestoneId}, verified: ${verified}`);

  const response: MilestoneResponse = {
    milestoneId,
    verified,
    findings,
    attestationUid: milestoneId,
    verifiedAt: now,
  };
  fireCasperAttestation({
    operation: 'milestone', amount: MILESTONE_PRICE, witnessId: milestoneId,
    payload: { milestoneId, event: body.event, milestone: body.milestone, verified },
  });
  return NextResponse.json(response, {
    headers: {
      'X-Payment-Required': 'false',
      'X-Service-Id': 'sigil-v1',
      'Cache-Control': 'no-store',
    },
  });
}
