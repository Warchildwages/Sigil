// @ts-nocheck  
// POST /api/share — generate a shareable attestation verification link + proof PDF
// Protected route (requires auth via middleware)
//
// Returns: verification URL (EASscan), proof PDF download URL, and an email-friendly summary.
// Recipients (lawyers, banks, counterparties) can independently verify the attestation on-chain.

import { NextResponse } from 'next/server';
import { prisma } from '@sigil/db';
import { getSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session.authenticated) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 },
      );
    }

    const { attestationId, recipientEmail } = (await request.json()) as {
      attestationId?: string;
      recipientEmail?: string;
    };

    if (!attestationId) {
      return NextResponse.json(
        { error: 'attestationId is required' },
        { status: 400 },
      );
    }

    // Fetch attestation with document and signatures
    const attestation = await prisma.attestation.findUnique({
      where: { id: attestationId },
      include: {
        document: {
          include: {
            signatures: {
              include: { entity: true },
            },
          },
        },
      },
    });

    if (!attestation) {
      return NextResponse.json(
        { error: 'Attestation not found' },
        { status: 404 },
      );
    }

    const doc = attestation.document;

    // Verify ownership (creator or signer)
    const isOwner = doc.createdByEntityId === session.entityId;
    const isSigner = doc.signatures.some((s) => s.entityId === session.entityId);
    if (!isOwner && !isSigner) {
      return NextResponse.json(
        { error: 'Not authorized to share this attestation' },
        { status: 403 },
      );
    }

    // Build verification URLs
    const chainId = attestation.chainId;
    let easScanUrl = '';
    if (chainId === 84532) {
      easScanUrl = `https://base-sepolia.easscan.org/attestation/view/${attestation.protocolUid}`;
    } else if (chainId === 8453) {
      easScanUrl = `https://easscan.org/attestation/view/${attestation.protocolUid}`;
    }

    const baseScanUrl = chainId === 84532 && attestation.transactionHash
      ? `https://sepolia.basescan.org/tx/${attestation.transactionHash}`
      : chainId === 8453 && attestation.transactionHash
        ? `https://basescan.org/tx/${attestation.transactionHash}`
        : null;

    // Build shareable summary
    const signers = doc.signatures.map((s) => ({
      name: s.entity?.name || 'Unknown',
      wallet: s.signerWallet,
      signedAt: s.signedAt,
      method: s.signingMethod,
    }));

    const proofPdfUrl = `${request.headers.get('origin') || 'https://signet.ventures'}/api/proof?attestationId=${attestationId}`;

    const summary = {
      documentTitle: doc.title,
      contentHash: doc.contentHash,
      attestationUid: attestation.protocolUid,
      attestedAt: attestation.attestedAt,
      chain: chainId === 84532 ? 'Base Sepolia' : chainId === 8453 ? 'Base' : `Chain ${chainId}`,
      signers,
      verification: {
        easScanUrl,
        baseScanUrl,
        proofPdfUrl,
      },
      // Email-ready plain text
      emailBody: recipientEmail
        ? generateEmailBody(doc.title, attestation.protocolUid, easScanUrl, proofPdfUrl, session.entityName)
        : null,
    };

    return NextResponse.json(summary, { status: 200 });
  } catch (error) {
    console.error('POST /api/share error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

function generateEmailBody(
  documentTitle: string,
  attestationUid: string,
  easScanUrl: string,
  proofPdfUrl: string,
  senderName?: string,
): string {
  return `Dear Recipient,

${senderName || 'A Signet user'} has shared a cryptographically attested document with you via Signet.

Document: ${documentTitle}
Attestation UID: ${attestationUid}

VERIFY ON-CHAIN (EASscan):
${easScanUrl || 'EAS verification not available for this chain'}

DOWNLOAD PROOF PDF:
${proofPdfUrl}

This document's SHA-256 hash and signatures have been permanently recorded on the Base blockchain via the Ethereum Attestation Service (EAS). The chain is the witness — anyone can independently verify this attestation at any time, without relying on Signet.

What is Signet? Signet is the universal platform for official acts — a cryptographically verifiable signing and attestation layer for society. Learn more: https://signet.ventures

— Sent via Signet. The chain is the witness.`;
}