// @ts-nocheck  
// GET /api/proof?attestationId=<id> — generate and return a downloadable attestation proof PDF
// Protected route (requires auth via middleware)

import { NextResponse } from 'next/server';
import { prisma } from '@sigil/db';
import { getSession } from '@/lib/auth';
import { generateProofPdf } from '@/lib/proof-pdf';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    // Verify session
    const session = await getSession();
    if (!session.authenticated) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 },
      );
    }

    const { searchParams } = new URL(request.url);
    const attestationId = searchParams.get('attestationId');

    if (!attestationId) {
      return NextResponse.json(
        { error: 'attestationId query parameter is required' },
        { status: 400 },
      );
    }

    // Fetch attestation with document and signing entity
    const attestation = await prisma.attestation.findUnique({
      where: { id: attestationId },
      include: {
        document: {
          include: {
            signatures: {
              include: {
                entity: true,
              },
              orderBy: { signedAt: 'desc' },
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

    // Verify the requesting entity owns this attestation (document's creator or signer)
    const doc = attestation.document;
    const isOwner = doc.createdByEntityId === session.entityId;
    const isSigner = doc.signatures.some((s) => s.entityId === session.entityId);
    if (!isOwner && !isSigner) {
      return NextResponse.json(
        { error: 'Not authorized to access this attestation proof' },
        { status: 403 },
      );
    }

    // Get the primary signer name from signatures
    const primarySignature = doc.signatures[0];
    const signerEntity = primarySignature?.entity;
    const signerName = signerEntity?.name;

    // Generate PDF
    const pdfBytes = await generateProofPdf({
      attestation: {
        id: attestation.id,
        documentId: attestation.documentId,
        protocol: attestation.protocol,
        protocolUid: attestation.protocolUid,
        schemaUid: attestation.schemaUid,
        attester: attestation.attester,
        recipient: attestation.recipient,
        data: attestation.data,
        privacyMode: attestation.privacyMode,
        chainId: attestation.chainId,
        blockNumber: attestation.blockNumber,
        transactionHash: attestation.transactionHash,
        attestedAt: attestation.attestedAt,
        createdAt: attestation.createdAt,
      },
      documentTitle: doc.title,
      contentHash: doc.contentHash,
      entityName: signerEntity?.name ?? session.entityName ?? 'Unknown',
      entityType: signerEntity?.type ?? 'individual',
      signerName: signerName ?? undefined,
    });

    // Return PDF as downloadable file — convert to Buffer for NextResponse compatibility
    return new NextResponse(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="signet-attestation-${attestation.protocolUid.slice(0, 8)}.pdf"`,
        'Content-Length': String(pdfBytes.byteLength),
      },
    });
  } catch (error) {
    console.error('GET /api/proof error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}