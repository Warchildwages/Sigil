import crypto from 'node:crypto';
import { paymentRequiredResponse, verifyPaymentHeader } from '@/lib/x402-payment';
import { oracleRequestSchema } from '@/lib/x402-schemas';
import type { OracleResponse } from '@sigil/shared';
import { NextResponse } from 'next/server';
import { fireCasperAttestation } from '@/lib/casper-attest-helper';

const ORACLE_PRICE = 0.05;

function sha256(data: string): string {
  return `0x${crypto.createHash('sha256').update(data).digest('hex')}`;
}

function generateId(): string {
  return `oracle_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function answerOracle(query: string): {
  answer: string;
  sources: OracleResponse['sources'];
  confidence: OracleResponse['confidence'];
} {
  const q = query.toLowerCase();
  if (q.includes('sec') && q.includes('bitcoin') && q.includes('etf')) {
    return {
      answer:
        'Yes. The SEC approved 11 spot Bitcoin ETFs on January 10, 2024. First ETFs began trading January 11, 2024. Major issuers include BlackRock (IBIT), Fidelity (FBTC), and Grayscale (GBTC).',
      sources: [
        {
          title: 'SEC Order Approving Bitcoin ETFs',
          url: 'https://www.sec.gov/files/34-99306.pdf',
          snippet:
            'Commission order approving proposed rule change to list and trade shares of spot Bitcoin exchange-traded products.',
        },
      ],
      confidence: 'high',
    };
  }
  if (q.includes('eidas') || q.includes('electronic identification')) {
    return {
      answer:
        'eIDAS 2.0 (Regulation EU 2024/1183) was published April 30, 2024 and entered into force May 20, 2024. It establishes the European Digital Identity Wallet framework with mandatory implementation by member states by 2026.',
      sources: [
        {
          title: 'EUR-Lex — eIDAS 2.0 Regulation',
          url: 'https://eur-lex.europa.eu/eli/reg/2024/1183',
          snippet: 'Regulation establishing the European Digital Identity Framework.',
        },
      ],
      confidence: 'high',
    };
  }
  return {
    answer:
      'Unable to determine a definitive answer. The question requires further research or falls outside currently indexed sources. Consider rephrasing or specifying a jurisdiction.',
    sources: [],
    confidence: 'low',
  };
}

export async function POST(request: Request) {
  const paymentCheck = verifyPaymentHeader(request.headers, 'oracle', ORACLE_PRICE);
  if (!paymentCheck.valid) {
    return paymentRequiredResponse('oracle', ORACLE_PRICE, paymentCheck.reason);
  }

  let body: { query: string };
  try {
    const payload = await request.json();
    const parsed = oracleRequestSchema.safeParse(payload);
    if (!parsed.success) {
      const errors = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
      return NextResponse.json({ error: 'Validation failed', details: errors }, { status: 400 });
    }
    body = parsed.data;
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const oracleId = generateId();
  const now = new Date().toISOString();
  const { answer, sources, confidence } = answerOracle(body.query);
  const attestationUid = sha256(
    `oracle:${oracleId}:${body.query.slice(0, 100)}:${confidence}:${now}`,
  );

  try {
    const db = await import('@sigil/db');
    const { prisma } = db;
    await prisma.oracleRecord?.create({
      data: {
        oracleId,
        query: body.query,
        answer,
        sources: sources as never,
        confidence,
        attestationUid,
        paymentId: paymentCheck.paymentId,
        generatedAt: new Date(),
      },
    });
  } catch {
    /* non-blocking */
  }

  console.log(`[x402 oracle] ${oracleId}, confidence: ${confidence}`);

  const response: OracleResponse = {
    oracleId,
    query: body.query,
    answer,
    sources,
    confidence,
    attestationUid,
    generatedAt: now,
  };
  fireCasperAttestation({
    operation: 'oracle', amount: ORACLE_PRICE, witnessId: oracleId,
    payload: { oracleId, query: body.query, answer, sources },
  });
  return NextResponse.json(response, {
    headers: {
      'X-Payment-Required': 'false',
      'X-Service-Id': 'sigil-v1',
      'Cache-Control': 'no-store',
    },
  });
}
