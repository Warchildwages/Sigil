import { buildMemoId, getArcMemoExplorerUrl } from '@sigil/blockchain';
import { prisma } from '@sigil/db';
import { createAttestationSchema } from '@sigil/shared';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = createAttestationSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    // If this is an Arc attestation, generate a deterministic memoId from the document hash.
    // The memoId = keccak256("notarial-act-" + contentHash) — queryable forever on Arc.
    // On-chain execution happens asynchronously via the agent wallet / Circle bundler.
    let memoId: string | undefined = parsed.data.memoId ?? undefined;
    const memoIndex: string | undefined = parsed.data.memoIndex ?? undefined;
    let arcscanUrl: string | undefined;

    if (parsed.data.chainId === 5042002 && !memoId) {
      // Generate memoId server-side from the document's content hash
      const document = await prisma.document.findUnique({
        where: { id: parsed.data.documentId },
        select: { contentHash: true },
      });
      if (document?.contentHash) {
        memoId = buildMemoId(document.contentHash);
        arcscanUrl = getArcMemoExplorerUrl(memoId);
      }
    }

    // Auto-assign sequential journal entry number per notary (attester)
    let sequentialNumber: number | null = null;
    try {
      const lastAttestation = await prisma.attestation.findFirst({
        where: { attester: parsed.data.attester, sequentialNumber: { not: null } },
        orderBy: { sequentialNumber: 'desc' },
        select: { sequentialNumber: true },
      });
      sequentialNumber = (lastAttestation?.sequentialNumber ?? 0) + 1;
    } catch {
      // Non-blocking — sequential numbering is best-effort for journal UX
      sequentialNumber = null;
    }

    const attestation = await prisma.attestation.create({
      data: {
        documentId: parsed.data.documentId,
        protocol: parsed.data.protocol,
        protocolUid: parsed.data.protocolUid,
        schemaUid: parsed.data.schemaUid,
        attester: parsed.data.attester,
        recipient: parsed.data.recipient,
        data: parsed.data.data,
        privacyMode: parsed.data.privacyMode,
        chainId: parsed.data.chainId,
        blockNumber: parsed.data.blockNumber ?? null,
        transactionHash: parsed.data.transactionHash ?? null,
        memoId: memoId ?? null,
        memoIndex: memoIndex ?? null,
        sequentialNumber,
        attestedAt: new Date(),
      },
      include: {
        document: true,
      },
    });

    // Update document status to attested
    await prisma.document.update({
      where: { id: parsed.data.documentId },
      data: { status: 'attested' },
    });

    return NextResponse.json({ ...attestation, arcscanUrl: arcscanUrl ?? null }, { status: 201 });
  } catch (error) {
    console.error('POST /api/attest error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const documentId = searchParams.get('documentId');
    const uid = searchParams.get('uid');

    if (uid) {
      const attestation = await prisma.attestation.findUnique({
        where: { protocolUid: uid },
        include: { document: true },
      });

      if (!attestation) {
        return NextResponse.json({ error: 'Attestation not found' }, { status: 404 });
      }

      return NextResponse.json(attestation);
    }

    if (documentId) {
      const attestations = await prisma.attestation.findMany({
        where: { documentId },
        orderBy: { createdAt: 'desc' },
      });

      return NextResponse.json(attestations);
    }

    return NextResponse.json(
      { error: 'Provide documentId or uid query parameter' },
      { status: 400 },
    );
  } catch (error) {
    console.error('GET /api/attest error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
