import crypto from 'node:crypto';
import { paymentRequiredResponse, verifyPaymentHeader } from '@/lib/x402-payment';
import { disputeResolutionRequestSchema } from '@/lib/x402-schemas';
import { NextResponse } from 'next/server';
import { fireCasperAttestation } from '@/lib/casper-attest-helper';

const DISPUTE_PRICE = 0.1;

function sha256(data: string): string {
  return `0x${crypto.createHash('sha256').update(data).digest('hex')}`;
}

function generateId(): string {
  const ts = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 8);
  return `dispute_${ts}_${rand}`;
}

interface DisputeResolutionResult {
  disputeId: string;
  ruling: string;
  reasoning: string;
  rulingAttestationUid: string;
  recommendedAction: string;
  resolvedAt: string;
}

function analyzeDisputeEvidence(initiatorDesc: string, counterpartyDesc: string) {
  const i = initiatorDesc.toLowerCase();
  const c = counterpartyDesc.toLowerCase();
  const iDelivered = i.includes('delivered') || i.includes('completed') || i.includes('fulfilled');
  const cDelivered = c.includes('delivered') || c.includes('completed') || c.includes('fulfilled');
  const iDisputes = i.includes('failed') || i.includes('incomplete') || i.includes('missing');
  const cDisputes = c.includes('failed') || c.includes('incomplete') || c.includes('missing');

  if (iDelivered && cDelivered) return { ruling: 'split', reasoning: 'Both parties assert deliverable completion.', recommendedAction: 'split_and_release' };
  if (iDelivered && cDisputes) return { ruling: 'for_counterparty', reasoning: 'Counterparty presents specific evidence of non-completion.', recommendedAction: 'release_to_counterparty' };
  if (cDelivered && iDisputes) return { ruling: 'for_initiator', reasoning: 'Initiator presents specific evidence of non-completion.', recommendedAction: 'release_to_initiator' };
  return { ruling: 'inconclusive', reasoning: 'Evidence from both parties is insufficient for automated ruling.', recommendedAction: 'manual_review' };
}

export async function POST(request: Request) {
  const paymentCheck = verifyPaymentHeader(request.headers, 'dispute', DISPUTE_PRICE);
  if (!paymentCheck.valid) {
    return paymentRequiredResponse('dispute', DISPUTE_PRICE, paymentCheck.reason);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let body: any;
  try {
    const payload = await request.json();
    const parsed = disputeResolutionRequestSchema.safeParse(payload);
    if (!parsed.success) {
      const errors = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
      return NextResponse.json({ error: 'Validation failed', details: errors }, { status: 400 });
    }
    body = parsed.data;
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { ruling, reasoning, recommendedAction } = analyzeDisputeEvidence(
    body.initiatorEvidence.description,
    body.counterpartyEvidence.description,
  );

  const disputeId = generateId();
  const now = new Date().toISOString();
  const rulingPayload = `${disputeId}:${body.escrowWitnessId}:${ruling}:${recommendedAction}:${now}`;
  const rulingAttestationUid = sha256(rulingPayload);

  try {
    const db = await import('@sigil/db');
    await db.prisma.disputeRecord?.create({
      data: {
        disputeId, escrowWitnessId: body.escrowWitnessId,
        initiatorEvidenceHash: body.initiatorEvidence.evidenceHash,
        initiatorDescription: body.initiatorEvidence.description,
        counterpartyEvidenceHash: body.counterpartyEvidence.evidenceHash,
        counterpartyDescription: body.counterpartyEvidence.description,
        ruling, reasoning, recommendedAction, rulingAttestationUid,
        paymentId: paymentCheck.paymentId, resolvedAt: new Date(),
      },
    });
  } catch { /* non-blocking */ }

  const response: DisputeResolutionResult = {
    disputeId, ruling, reasoning, rulingAttestationUid, recommendedAction, resolvedAt: now,
  };

  fireCasperAttestation({
    operation: 'dispute', amount: DISPUTE_PRICE, witnessId: disputeId,
    payload: { disputeId, escrowWitnessId: body.escrowWitnessId, ruling, recommendedAction },
  });

  return NextResponse.json(response, {
    headers: { 'X-Payment-Required': 'false', 'X-Service-Id': 'sigil-v1', 'X-Ruling': ruling, 'Cache-Control': 'no-store' },
  });
}
