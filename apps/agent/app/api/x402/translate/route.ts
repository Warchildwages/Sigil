import crypto from 'node:crypto';
import { paymentRequiredResponse, verifyPaymentHeader } from '@/lib/x402-payment';
import { translateRequestSchema } from '@/lib/x402-schemas';
import type { TranslateResponse } from '@signet/shared';
import { NextResponse } from 'next/server';
import { fireCasperAttestation } from '@/lib/casper-attest-helper';

const TRANSLATE_PRICE = 0.03;

function sha256(data: string): string {
  return `0x${crypto.createHash('sha256').update(data).digest('hex')}`;
}

function generateId(): string {
  return `tr_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export async function POST(request: Request) {
  const paymentCheck = verifyPaymentHeader(request.headers, 'translate', TRANSLATE_PRICE);
  if (!paymentCheck.valid) {
    return paymentRequiredResponse('translate', TRANSLATE_PRICE, paymentCheck.reason);
  }

  let body;
  try {
    const payload = await request.json();
    const parsed = translateRequestSchema.safeParse(payload);
    if (!parsed.success) {
      const errors = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
      return NextResponse.json({ error: 'Validation failed', details: errors }, { status: 400 });
    }
    body = parsed.data;
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const translationId = generateId();
  const now = new Date().toISOString();
  const accurate = body.sourceHash.length >= 64 && body.translationHash.length >= 64;
  const discrepancies: string[] = accurate
    ? []
    : [
        'Translation integrity cannot be verified: source or translation hash appears invalid. Both must be valid hex hashes (64+ chars).',
      ];

  const attestationUid = sha256(
    `translate:${translationId}:${body.sourceHash}:${body.translationHash}:${accurate}:${now}`,
  );

  try {
    const db = await import('@signet/db');
    const { prisma } = db;
    await prisma.translationRecord?.create({
      data: {
        translationId,
        sourceHash: body.sourceHash,
        translationHash: body.translationHash,
        sourceLanguage: body.sourceLanguage,
        targetLanguage: body.targetLanguage,
        sourceUri: body.sourceUri,
        translationUri: body.translationUri,
        chainId: body.chainId,
        accurate,
        discrepancies,
        attestationUid,
        paymentId: paymentCheck.paymentId,
        attestedAt: new Date(),
      },
    });
  } catch {
    /* non-blocking */
  }

  console.log(
    `[x402 translate] ${translationId}, ${body.sourceLanguage}→${body.targetLanguage}, accurate: ${accurate}`,
  );

  const response: TranslateResponse = {
    translationId,
    accurate,
    discrepancies,
    attestationUid,
    attestedAt: now,
  };
  fireCasperAttestation({
    operation: 'translate', amount: TRANSLATE_PRICE, witnessId: translationId,
    payload: { translationId, documentHash: body.documentHash, sourceLanguage: body.sourceLanguage, targetLanguage: body.targetLanguage, accurate },
  });
  return NextResponse.json(response, {
    headers: {
      'X-Payment-Required': 'false',
      'X-Service-Id': 'sigil-v1',
      'Cache-Control': 'no-store',
    },
  });
}
