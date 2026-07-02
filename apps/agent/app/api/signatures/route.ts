import { NextResponse } from 'next/server';
import { prisma } from '@sigil/db';
import { createSignatureSchema } from '@sigil/shared';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = createSignatureSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const signature = await prisma.signature.create({
      data: {
        documentId: parsed.data.documentId,
        entityId: parsed.data.entityId,
        roleId: parsed.data.roleId ?? null,
        officeholderId: parsed.data.officeholderId ?? null,
        signerWallet: parsed.data.signerWallet,
        signatureProof: parsed.data.signatureProof,
        signingMethod: parsed.data.signingMethod,
        supplementaryProof: parsed.data.supplementaryProof ?? null,
        chainId: parsed.data.chainId,
        status: 'signed',
        signedAt: new Date(),
      },
    });

    // Update document status to signed
    await prisma.document.update({
      where: { id: parsed.data.documentId },
      data: { status: 'signed' },
    });

    return NextResponse.json(signature, { status: 201 });
  } catch (error) {
    console.error('POST /api/signatures error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const documentId = searchParams.get('documentId');

    if (!documentId) {
      return NextResponse.json(
        { error: 'documentId query parameter is required' },
        { status: 400 },
      );
    }

    const signatures = await prisma.signature.findMany({
      where: { documentId },
      orderBy: { createdAt: 'desc' },
      include: {
        entity: true,
        officeholder: true,
      },
    });

    return NextResponse.json(signatures);
  } catch (error) {
    console.error('GET /api/signatures error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}