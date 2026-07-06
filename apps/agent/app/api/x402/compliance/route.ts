import crypto from 'node:crypto';
import { paymentRequiredResponse, verifyPaymentHeader } from '@/lib/x402-payment';
import { complianceRequestSchema } from '@/lib/x402-schemas';
import type { ComplianceResponse } from '@sigil/shared';
import { NextResponse } from 'next/server';
import { fireCasperAttestation } from '@/lib/casper-attest-helper';

const COMPLIANCE_PRICE = 0.05;

function sha256(data: string): string {
  return `0x${crypto.createHash('sha256').update(data).digest('hex')}`;
}

function generateId(): string {
  return `comp_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function auditCompliance(
  standard: string,
  description: string,
): {
  compliant: boolean;
  findings: string[];
} {
  const descLower = description.toLowerCase();
  const findings: string[] = [];

  if (descLower.includes('gdpr') || standard.includes('GDPR')) {
    if (descLower.includes('consent') && descLower.includes('opt-out'))
      findings.push('GDPR Art.7: Consent mechanism present with opt-out capability');
    else findings.push('GDPR Art.7: No explicit consent mechanism detected in audit evidence');
    if (descLower.includes('data') && (descLower.includes('encrypt') || descLower.includes('hash')))
      findings.push('GDPR Art.32: Data protection measures (encryption/hashing) detected');
    else findings.push('GDPR Art.32: No data protection measures detected in audit evidence');
  }

  if (standard.includes('ABA') || descLower.includes('bar association')) {
    if (descLower.includes('disclaimer') || descLower.includes('not legal advice'))
      findings.push('ABA Guideline: Required disclaimers present');
    else findings.push('ABA Guideline: Missing required "not legal advice" disclaimer');
    if (descLower.includes('supervision') || descLower.includes('review'))
      findings.push('ABA Guideline: Human supervision/review process documented');
    else findings.push('ABA Guideline: No human supervision process documented');
  }

  if (findings.length === 0) {
    findings.push(
      `Standard ${standard}: No specific compliance checks available. Manual review recommended.`,
    );
  }

  const compliant = findings.every(
    (f) =>
      !f.startsWith('GDPR Art.7: No') &&
      !f.startsWith('GDPR Art.32: No') &&
      !f.startsWith('ABA Guideline: Missing') &&
      !f.includes('No specific') &&
      !f.startsWith('Standard'),
  );
  return { compliant, findings };
}

export async function POST(request: Request) {
  const paymentCheck = await verifyPaymentHeader(request.headers, 'compliance', COMPLIANCE_PRICE);
  if (!paymentCheck.valid) {
    return paymentRequiredResponse('compliance', COMPLIANCE_PRICE, paymentCheck.reason);
  }

  let body;
  try {
    const payload = await request.json();
    const parsed = complianceRequestSchema.safeParse(payload);
    if (!parsed.success) {
      const errors = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
      return NextResponse.json({ error: 'Validation failed', details: errors }, { status: 400 });
    }
    body = parsed.data;
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const complianceId = generateId();
  const now = new Date().toISOString();
  const { compliant, findings } = auditCompliance(body.standard, body.description);
  const attestationUid = sha256(
    `compliance:${complianceId}:${body.subjectId}:${body.standard}:${compliant}:${now}`,
  );

  try {
    const db = await import('@sigil/db');
    const { prisma } = db;
    await prisma.complianceRecord?.create({
      data: {
        complianceId,
        subjectId: body.subjectId,
        standard: body.standard,
        evidenceHash: body.evidenceHash,
        evidenceUri: body.evidenceUri,
        description: body.description,
        chainId: body.chainId,
        compliant,
        findings,
        attestationUid,
        paymentId: paymentCheck.paymentId,
        auditedAt: new Date(),
      },
    });
  } catch {
    /* non-blocking */
  }

  console.log(`[x402 compliance] ${complianceId}, ${body.standard}, compliant: ${compliant}`);

  const response: ComplianceResponse = {
    complianceId,
    compliant,
    findings,
    attestationUid,
    standard: body.standard,
    auditedAt: now,
  };

  fireCasperAttestation({ operation: 'compliance', amount: COMPLIANCE_PRICE, witnessId: complianceId, payload: { complianceId, standard: body.standard, compliant } });

  return NextResponse.json(response, {
    headers: {
      'X-Payment-Required': 'false',
      'X-Service-Id': 'sigil-v1',
      'Cache-Control': 'no-store',
    },
  });
}
