// x402 Multi-Chain Payment Verification
//
// Verifies x402 payments via Casper Ed25519 (PAYMENT-SIGNATURE) or
// Circle Gateway (x-402-* headers). Routes settlement to the right facilitator.
//
// Supports:
//   PAYMENT-SIGNATURE  — Casper x402 (Ed25519 via tweetnacl + CSPR.cloud)
//   X-Casper-Payment   — Casper alternative header
//   X-Payment-Id       — Legacy/dev (format-checked only, rejected in production)
//   x-402-* headers    — Circle Gateway x402 (multi-chain: Base, Arc, etc.)

import nacl from 'tweetnacl';
import { decodeHex } from './hex-utils';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CASPER_FACILITATOR_URL = process.env.CASPER_FACILITATOR_URL || 'https://x402-facilitator.cspr.cloud';
const CSPR_CLOUD_API_KEY = process.env.CSPR_CLOUD_API_KEY || '';
const CIRCLE_GATEWAY_BASE = process.env.CIRCLE_GATEWAY_BASE || 'https://api.circle.com/v1';
const CIRCLE_API_KEY = process.env.CIRCLE_API_KEY || '';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type PaymentProtocol = 'casper' | 'circle' | 'legacy';

export interface PaymentVerificationResult {
  valid: boolean;
  protocol?: PaymentProtocol;
  paymentId: string;
  amount?: string;
  timestamp?: string;
  chain?: string;
  reason?: string;
}

interface ExactCasperAuthorization {
  from: string;
  to: string;
  value: string;
  validAfter: string;
  validBefore: string;
  nonce: string;
}

interface ExactCasperPayload {
  signature: string;
  publicKey: string;
  authorization: ExactCasperAuthorization;
}

interface CirclePaymentPayload {
  'x-402-amount': string;
  'x-402-payment-intent': string;
  'x-402-token': 'USDC';
  'x-402-recipient': string;
  'x-402-idempotency-key': string;
  'x-402-expires-at': string;
}

// ---------------------------------------------------------------------------
// Protocol Detection
// ---------------------------------------------------------------------------

function detectProtocol(headers: Headers): PaymentProtocol | null {
  if (headers.get('PAYMENT-SIGNATURE') || headers.get('X-Casper-Payment')) {
    return 'casper';
  }
  if (headers.get('x-402-amount')) {
    return 'circle';
  }
  if (headers.get('X-Payment-Id')) {
    return 'legacy';
  }
  return null;
}

// ---------------------------------------------------------------------------
// Address Validation
// ---------------------------------------------------------------------------

function isValidCasperAddress(address: string): boolean {
  return /^(00|01)[0-9a-fA-F]{64}$/.test(address);
}

function isValidEthereumAddress(address: string): boolean {
  return /^0x[0-9a-fA-F]{40}$/.test(address);
}

// ---------------------------------------------------------------------------
// Ed25519 Signature Verification
// ---------------------------------------------------------------------------

function isValidCasperSignature(payload: ExactCasperPayload): boolean {
  try {
    const authBytes = new TextEncoder().encode(JSON.stringify(payload.authorization));
    const signature = decodeHex(payload.signature);
    const publicKey = decodeHex(payload.publicKey);
    return nacl.sign.detached.verify(authBytes, signature, publicKey);
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Main Verification
// ---------------------------------------------------------------------------

/**
 * Verify an x402 payment from request headers.
 * Supports Casper (PAYMENT-SIGNATURE), Circle (x-402-*), and legacy (X-Payment-Id).
 */
export async function verifyPaymentHeader(
  headers: Headers,
  expectedOperation: string,
  expectedAmountUSDC?: number,
): Promise<PaymentVerificationResult> {
  const protocol = detectProtocol(headers);

  if (protocol === 'casper') {
    return verifyCasperPayment(headers, expectedOperation, expectedAmountUSDC);
  }
  if (protocol === 'circle') {
    return verifyCirclePayment(headers, expectedOperation, expectedAmountUSDC);
  }
  if (protocol === 'legacy') {
    return verifyLegacyPayment(headers.get('X-Payment-Id') || '', expectedOperation);
  }

  return {
    valid: false,
    paymentId: '',
    reason: 'Missing payment header. Send PAYMENT-SIGNATURE (Casper Ed25519), x-402-amount (Circle), or X-Payment-Id (legacy/dev).',
  };
}

// ── Casper verification ────────────────────────────────────────────────

async function verifyCasperPayment(
  headers: Headers,
  operation: string,
  expectedAmountUSDC?: number,
): Promise<PaymentVerificationResult> {
  const raw = headers.get('PAYMENT-SIGNATURE') || headers.get('X-Casper-Payment') || '';

  try {
    const parsed = JSON.parse(raw) as ExactCasperPayload;

    if (!parsed.signature || !parsed.publicKey || !parsed.authorization) {
      return { valid: false, protocol: 'casper', paymentId: raw.slice(0, 40), reason: 'PAYMENT_PROOF_MISSING_FIELDS' };
    }

    const auth = parsed.authorization;

    if (!auth.from || !auth.to || auth.value === undefined ||
        auth.validAfter === undefined || auth.validBefore === undefined || !auth.nonce) {
      return { valid: false, protocol: 'casper', paymentId: raw.slice(0, 40), reason: 'INVALID_AUTHORIZATION' };
    }

    if (!isValidCasperAddress(auth.from)) {
      return { valid: false, protocol: 'casper', paymentId: auth.from, reason: 'INVALID_PAYER_ADDRESS' };
    }
    if (!isValidCasperAddress(auth.to)) {
      return { valid: false, protocol: 'casper', paymentId: auth.to, reason: 'INVALID_PAYEE_ADDRESS' };
    }

    const now = Math.floor(Date.now() / 1000);
    if (Number(auth.validBefore) < now) {
      return { valid: false, protocol: 'casper', paymentId: auth.from, reason: 'PAYMENT_EXPIRED' };
    }
    if (Number(auth.validAfter) > now) {
      return { valid: false, protocol: 'casper', paymentId: auth.from, reason: 'PAYMENT_NOT_YET_VALID' };
    }

    if (expectedAmountUSDC !== undefined) {
      const expectedAtomic = BigInt(Math.floor(expectedAmountUSDC * 1_000_000));
      if (BigInt(auth.value) !== expectedAtomic) {
        return { valid: false, protocol: 'casper', paymentId: auth.from, reason: `AMOUNT_MISMATCH expected=${expectedAtomic} got=${auth.value}` };
      }
    }

    if (!isValidCasperSignature(parsed)) {
      return { valid: false, protocol: 'casper', paymentId: auth.from, reason: 'INVALID_SIGNATURE' };
    }

    return {
      valid: true,
      protocol: 'casper',
      paymentId: auth.from,
      amount: auth.value,
      chain: process.env.CASPER_NETWORK || 'casper:casper-test',
      timestamp: String(now),
    };
  } catch (err) {
    return { valid: false, protocol: 'casper', paymentId: '', reason: `VERIFICATION_ERROR: ${err instanceof Error ? err.message : 'Unexpected'}` };
  }
}

// ── Circle Gateway verification ────────────────────────────────────────

async function verifyCirclePayment(
  headers: Headers,
  operation: string,
  expectedAmountUSDC?: number,
): Promise<PaymentVerificationResult> {
  const h = (name: string) => headers.get(name) || '';

  const payload: CirclePaymentPayload = {
    'x-402-amount': h('x-402-amount'),
    'x-402-payment-intent': h('x-402-payment-intent'),
    'x-402-token': 'USDC',
    'x-402-recipient': h('x-402-recipient'),
    'x-402-idempotency-key': h('x-402-idempotency-key'),
    'x-402-expires-at': h('x-402-expires-at'),
  };

  if (!payload['x-402-amount'] || !payload['x-402-payment-intent'] || !payload['x-402-recipient']) {
    return { valid: false, protocol: 'circle', paymentId: '', reason: 'MISSING_X402_HEADERS' };
  }

  if (!isValidEthereumAddress(payload['x-402-recipient'])) {
    return { valid: false, protocol: 'circle', paymentId: payload['x-402-recipient'], reason: 'INVALID_RECIPIENT_ADDRESS' };
  }

  const actualAmount = parseFloat(payload['x-402-amount']);
  if (expectedAmountUSDC !== undefined && actualAmount < expectedAmountUSDC) {
    return { valid: false, protocol: 'circle', paymentId: payload['x-402-recipient'], reason: `AMOUNT_BELOW_MINIMUM expected=${expectedAmountUSDC} got=${actualAmount}` };
  }

  const expiresAt = Number(payload['x-402-expires-at']);
  if (expiresAt && expiresAt < Date.now()) {
    return { valid: false, protocol: 'circle', paymentId: payload['x-402-recipient'], reason: 'PAYMENT_EXPIRED' };
  }

  // Dev/test mode: accept without Gateway verification
  if (process.env.SIGIL_MOCK_MODE === 'true') {
    return {
      valid: true,
      protocol: 'circle',
      paymentId: payload['x-402-payment-intent'],
      amount: payload['x-402-amount'],
      chain: 'base',
    };
  }

  // Production: verify via Circle Gateway
  if (!CIRCLE_API_KEY) {
    return { valid: false, protocol: 'circle', paymentId: '', reason: 'CIRCLE_API_KEY_NOT_CONFIGURED' };
  }

  try {
    const resp = await fetch(`${CIRCLE_GATEWAY_BASE}/x402/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${CIRCLE_API_KEY}` },
      body: JSON.stringify({
        paymentPayload: payload,
        paymentRequirements: { network: 'eip155:8453', token: 'USDC', amount: String(expectedAmountUSDC || actualAmount) },
      }),
    });

    if (!resp.ok) {
      return { valid: false, protocol: 'circle', paymentId: '', reason: `CIRCLE_GATEWAY_ERROR: ${await resp.text()}` };
    }

    const data = await resp.json() as { payer?: string };
    return {
      valid: true,
      protocol: 'circle',
      paymentId: data.payer || payload['x-402-payment-intent'],
      amount: payload['x-402-amount'],
      chain: 'base',
    };
  } catch (err) {
    return { valid: false, protocol: 'circle', paymentId: '', reason: `CIRCLE_GATEWAY_UNREACHABLE: ${err instanceof Error ? err.message : String(err)}` };
  }
}

// ── Legacy verification ────────────────────────────────────────────────

function verifyLegacyPayment(
  paymentId: string,
  operation: string,
): PaymentVerificationResult {
  const trimmed = paymentId.trim();

  if (trimmed.length === 0) {
    return { valid: false, protocol: 'legacy', paymentId: '', reason: 'X-Payment-Id header is empty.' };
  }

  if (process.env.NODE_ENV === 'production') {
    return { valid: false, protocol: 'legacy', paymentId: trimmed, reason: 'X-Payment-Id not accepted in production. Use PAYMENT-SIGNATURE (Casper) or x-402-* headers (Circle).' };
  }

  console.log(`[x402 payment] op=${operation} id=${trimmed.slice(0, 20)}... (LEGACY — no crypto verification)`);
  return { valid: true, protocol: 'legacy', paymentId: trimmed };
}

// ---------------------------------------------------------------------------
// 402 Response Builder (Multi-Chain)
// ---------------------------------------------------------------------------

export function paymentRequiredResponse(
  operation: string,
  priceUSDC: number,
  reason?: string,
): Response {
  return new Response(
    JSON.stringify({
      error: 'Payment required',
      code: 'PAYMENT_REQUIRED',
      details: reason || `${priceUSDC} USDC required for ${operation}.`,
      payment_required: {
        casper: {
          network: process.env.CASPER_NETWORK || 'casper:casper-test',
          scheme: 'exact',
          asset: 'USDC (CEP-18)',
          amount: String(priceUSDC),
          operation,
          header: 'PAYMENT-SIGNATURE',
        },
        circle: {
          network: 'eip155:8453',
          token: 'USDC',
          amount: String(priceUSDC),
          operation,
          headers: ['x-402-amount', 'x-402-payment-intent', 'x-402-token', 'x-402-recipient', 'x-402-idempotency-key', 'x-402-expires-at'],
        },
      },
      service_id: 'sigil-v1',
    }),
    {
      status: 402,
      headers: {
        'Content-Type': 'application/json',
        'X-Payment-Required': 'true',
        'X-Service-Id': 'sigil-v1',
        'X-Operation': operation,
      },
    },
  );
}
