import crypto from 'node:crypto';
import { paymentRequiredResponse, verifyPaymentHeader } from '@/lib/x402-payment';
import { witnessRequestSchema } from '@/lib/x402-schemas';
import type { WitnessResponse } from '@signet/shared';
import { NextResponse } from 'next/server';
import { fireCasperAttestation } from '@/lib/casper-attest-helper';

const WITNESS_PRICE = 0.02;

function generateWitnessId(): string {
  const ts = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 8);
  return `witness_${ts}_${rand}`;
}

function sha256(data: string): string {
  return `0x${crypto.createHash('sha256').update(data).digest('hex')}`;
}

export async function POST(request: Request) {
  const paymentCheck = verifyPaymentHeader(request.headers, 'witness', WITNESS_PRICE);
  if (!paymentCheck.valid) {
    return paymentRequiredResponse('witness', WITNESS_PRICE, paymentCheck.reason);
  }

  let event: string;
  let evidenceHash: string;
  let evidenceUri: string | undefined;
  let initiator: string;
  let counterparty: string;
  let chainId: number;
  let memo: string | undefined;

  try {
    const payload = await request.json();
    const parsed = witnessRequestSchema.safeParse(payload);
    if (!parsed.success) {
      const errors = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
      return NextResponse.json({ error: 'Validation failed', details: errors }, { status: 400 });
    }
    const body = parsed.data;
    event = body.event;
    evidenceHash = body.evidenceHash;
    evidenceUri = body.evidenceUri;
    initiator = body.parties.initiator;
    counterparty = body.parties.counterparty;
    chainId = body.chainId;
    memo = body.memo;
  } catch (err) {
    if (err instanceof Response) return err;
    return NextResponse.json(
      { error: 'Invalid request body', details: 'Request body must be valid JSON.' },
      { status: 400 },
    );
  }

  const witnessId = generateWitnessId();
  const now = new Date().toISOString();
  const attestationPayload = `${witnessId}:${event}:${evidenceHash}:${initiator}:${counterparty}:${chainId}:${Date.now()}`;
  const attestationUid = sha256(attestationPayload);
  const memoIdResult = memo ? `memo_${sha256(`${witnessId}:${memo}`).slice(2, 18)}` : undefined;

  try {
    const db = await import('@signet/db');
    const { prisma } = db;
    await prisma.witnessRecord?.create({
      data: {
        witnessId, event, evidenceHash, evidenceUri, initiator, counterparty,
        chainId, memo, attestationUid, memoId: memoIdResult,
        paymentId: paymentCheck.paymentId,
        paymentAmountUSDC: String(WITNESS_PRICE),
        paymentVerified: true, status: 'attested', witnessedAt: new Date(),
      },
    });
  } catch { /* non-blocking */ }

  const response: WitnessResponse = {
    witnessId, attestationUid, memoId: memoIdResult, witnessedAt: now,
    txn: { attestationTx: attestationUid, ...(memo ? { memoTx: sha256(memo) } : {}) },
  };

  // Dual-chain: Casper AgentAttest
  fireCasperAttestation({
    operation: 'witness', amount: WITNESS_PRICE, witnessId, event, evidenceHash,
    payload: { witnessId, event, evidenceHash, initiator, counterparty, chainId },
  });

  return NextResponse.json(response, {
    headers: { 'X-Payment-Required': 'false', 'X-Service-Id': 'sigil-v1', 'Cache-Control': 'no-store' },
  });
}
