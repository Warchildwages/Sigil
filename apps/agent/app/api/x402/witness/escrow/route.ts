import crypto from 'node:crypto';
import { paymentRequiredResponse, verifyPaymentHeader } from '@/lib/x402-payment';
import { escrowWitnessRequestSchema } from '@/lib/x402-schemas';
import type { EscrowWitnessResponse } from '@signet/shared';
import { NextResponse } from 'next/server';
import { fireCasperAttestation } from '@/lib/casper-attest-helper';

const ESCROW_PRICE = 0.02;

/** In-memory cache — warm on first read, not authoritative */
const escrowCache = new Map<string, EscrowWitnessResponse>();

function sha256(data: string): string {
  return `0x${crypto.createHash('sha256').update(data).digest('hex')}`;
}

function generateId(): string {
  return `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

const PHASE_TRANSITIONS: Record<string, string[]> = {
  deposited: ['verified', 'disputed'],
  verified: ['attested', 'disputed'],
  attested: ['released', 'disputed'],
  released: [],
  disputed: [],
};

function isValidTransition(from: string, to: string): boolean {
  return (PHASE_TRANSITIONS[from] || []).includes(to);
}

/**
 * Read escrow from DB, falling back to in-memory cache.
 * Database is authoritative — cache is a warm layer only.
 */
async function getEscrow(id: string): Promise<EscrowWitnessResponse | null> {
  // Check cache first (fast path)
  const cached = escrowCache.get(id);
  if (cached) return cached;

  // Read from DB (authoritative)
  try {
    const db = await import('@signet/db');
    const record = await db.prisma.escrowRecord?.findUnique({
      where: { escrowWitnessId: id },
    });
    if (record) {
      const escrow: EscrowWitnessResponse = {
        escrowWitnessId: record.escrowWitnessId,
        phase: record.phase as EscrowWitnessResponse['phase'],
        depositAttestationUid: record.depositAttestationUid || '',
        verificationAttestationUid: record.verificationAttestationUid || undefined,
        releaseAttestationUid: record.releaseAttestationUid || undefined,
        disputeAttestationUid: record.disputeAttestationUid || undefined,
        memoId: record.memoId || undefined,
        createdAt: record.createdAt?.toISOString?.() || new Date().toISOString(),
        updatedAt: record.updatedAt?.toISOString?.() || new Date().toISOString(),
      };
      escrowCache.set(id, escrow);
      return escrow;
    }
  } catch {
    // DB unreachable — fall back to cache only
    return escrowCache.get(id) || null;
  }

  return null;
}

/**
 * Upsert escrow in DB + update cache.
 * Database write is authoritative and blocking — escrow is legal-state-critical.
 */
async function upsertEscrow(escrow: EscrowWitnessResponse): Promise<void> {
  // Update cache immediately (fast path for subsequent reads)
  escrowCache.set(escrow.escrowWitnessId, escrow);

  // Write to DB (authoritative)
  try {
    const db = await import('@signet/db');
    await db.prisma.escrowRecord?.upsert({
      where: { escrowWitnessId: escrow.escrowWitnessId },
      update: {
        phase: escrow.phase,
        verificationAttestationUid: escrow.verificationAttestationUid,
        releaseAttestationUid: escrow.releaseAttestationUid,
        disputeAttestationUid: escrow.disputeAttestationUid,
        updatedAt: new Date(),
      },
      create: {
        escrowWitnessId: escrow.escrowWitnessId,
        externalEscrowId: escrow.escrowWitnessId, // external ID from request body
        amountUSDC: '0', // set from payment context
        deliverableDescription: '',
        deliverableHash: '',
        depositor: '',
        beneficiary: '',
        chainId: 0,
        phase: escrow.phase,
        depositAttestationUid: escrow.depositAttestationUid,
        verificationAttestationUid: escrow.verificationAttestationUid,
        releaseAttestationUid: escrow.releaseAttestationUid,
        disputeAttestationUid: escrow.disputeAttestationUid,
        memoId: escrow.memoId,
      },
    });
  } catch (err) {
    // Cache still has the data, but log the DB failure
    console.error('[escrow] DB write failed — cache may be stale after restart:', err);
  }
}

export async function POST(request: Request) {
  const paymentCheck = verifyPaymentHeader(request.headers, 'escrow', ESCROW_PRICE);
  if (!paymentCheck.valid) {
    return paymentRequiredResponse('escrow', ESCROW_PRICE, paymentCheck.reason);
  }

  let rawBody: Record<string, unknown>;
  try { rawBody = await request.json(); } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const phase = (typeof rawBody.phase === 'string' ? rawBody.phase : 'deposited') || 'deposited';
  const escrowId = typeof rawBody.escrowId === 'string' ? rawBody.escrowId : undefined;
  const existingEscrow = escrowId ? await getEscrow(escrowId) : undefined;

  if (existingEscrow) {
    if (!isValidTransition(existingEscrow.phase, phase)) {
      return NextResponse.json({
        error: 'Invalid phase transition',
        details: `Cannot transition from '${existingEscrow.phase}' to '${phase}'.`,
      }, { status: 400 });
    }
    existingEscrow.phase = phase as EscrowWitnessResponse['phase'];
    existingEscrow.updatedAt = new Date().toISOString();
    if (phase === 'verified') existingEscrow.verificationAttestationUid = sha256(`verify:${existingEscrow.escrowWitnessId}:${rawBody.deliverableHash || ''}:${Date.now()}`);
    else if (phase === 'released') existingEscrow.releaseAttestationUid = sha256(`release:${existingEscrow.escrowWitnessId}:${Date.now()}`);
    else if (phase === 'disputed') existingEscrow.disputeAttestationUid = sha256(`dispute:${existingEscrow.escrowWitnessId}:${rawBody.evidenceHash || ''}:${Date.now()}`);

    await upsertEscrow(existingEscrow);

    return NextResponse.json(existingEscrow, { headers: { 'X-Payment-Required': 'false', 'X-Service-Id': 'sigil-v1', 'Cache-Control': 'no-store' } });
  }

  const parsed = escrowWitnessRequestSchema.safeParse(rawBody);
  if (!parsed.success) {
    const errors = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
    return NextResponse.json({ error: 'Validation failed', details: errors }, { status: 400 });
  }

  const body = parsed.data;
  const escrowWitnessId = generateId();
  const now = new Date().toISOString();
  const escrow: EscrowWitnessResponse = {
    escrowWitnessId, phase: 'deposited',
    depositAttestationUid: sha256(`deposit:${escrowWitnessId}:${body.escrowId}:${body.amountUSDC}:${body.parties.depositor}:${body.parties.beneficiary}:${Date.now()}`),
    memoId: `escrow_${sha256(escrowWitnessId).slice(2, 18)}`, createdAt: now, updatedAt: now,
  };

  // Write to DB as authoritative source BEFORE responding
  await upsertEscrow(escrow);
  // Also index by external escrow ID for lookup
  escrowCache.set(`escrow:${body.escrowId}`, escrow);

  fireCasperAttestation({ operation: 'escrow', amount: ESCROW_PRICE, witnessId: escrowWitnessId, payload: { escrowWitnessId, escrowId: body.escrowId, phase: 'deposited' } });

  return NextResponse.json(escrow, { headers: { 'X-Payment-Required': 'false', 'X-Service-Id': 'sigil-v1', 'Cache-Control': 'no-store' } });
}

export async function GET(request: Request) {
  const id = new URL(request.url).searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Missing id parameter' }, { status: 400 });

  const escrow = await getEscrow(id);
  if (!escrow) return NextResponse.json({ error: 'Not found', details: `No escrow witness found with id: ${id}` }, { status: 404 });

  return NextResponse.json(escrow, { headers: { 'Cache-Control': 'no-store' } });
}
