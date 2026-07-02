import crypto from 'node:crypto';
import { paymentRequiredResponse, verifyPaymentHeader } from '@/lib/x402-payment';
import { timestampRequestSchema } from '@/lib/x402-schemas';
import type { TimestampResponse } from '@sigil/shared';
import { NextResponse } from 'next/server';
import { fireCasperAttestation } from '@/lib/casper-attest-helper';

const TIMESTAMP_PRICE = 0.005;

function sha256(data: string): string {
  return `0x${crypto.createHash('sha256').update(data).digest('hex')}`;
}

function generateId(): string {
  return `ts_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export async function POST(request: Request) {
  const paymentCheck = verifyPaymentHeader(request.headers, 'timestamp', TIMESTAMP_PRICE);
  if (!paymentCheck.valid) {
    return paymentRequiredResponse('timestamp', TIMESTAMP_PRICE, paymentCheck.reason);
  }

  let body;
  try {
    const payload = await request.json();
    const parsed = timestampRequestSchema.safeParse(payload);
    if (!parsed.success) {
      const errors = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
      return NextResponse.json({ error: 'Validation failed', details: errors }, { status: 400 });
    }
    body = parsed.data;
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const timestampId = generateId();
  const now = new Date().toISOString();
  const attestationUid = sha256(
    `timestamp:${timestampId}:${body.contentHash}:${body.chainId}:${now}`,
  );

  try {
    const db = await import('@sigil/db');
    const { prisma } = db;
    await prisma.timestampRecord?.create({
      data: {
        timestampId,
        contentHash: body.contentHash,
        contentUri: body.contentUri,
        description: body.description,
        chainId: body.chainId,
        attestationUid,
        memoId: `ts_${sha256(timestampId).slice(2, 18)}`,
        paymentId: paymentCheck.paymentId,
        attestedAt: new Date(),
      },
    });
  } catch {
    /* non-blocking */
  }

  console.log(`[x402 timestamp] ${timestampId}, hash: ${body.contentHash.slice(0, 18)}...`);

  const response: TimestampResponse = {
    timestampId,
    attestationUid,
    memoId: `ts_${sha256(timestampId).slice(2, 18)}`,
    attestedAt: now,
  };

  fireCasperAttestation({ operation: 'timestamp', amount: TIMESTAMP_PRICE, witnessId: timestampId, payload: { timestampId, contentHash: body.contentHash } });

  return NextResponse.json(response, {
    headers: {
      'X-Payment-Required': 'false',
      'X-Service-Id': 'sigil-v1',
      'Cache-Control': 'no-store',
    },
  });
}
