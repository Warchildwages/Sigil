import { NextResponse } from 'next/server';
import { prisma } from '@sigil/db';
import { createDocumentSchema } from '@sigil/shared';
import { getSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = createDocumentSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    // Validate MIME type server-side (not just extension)
    const ALLOWED_MIME_TYPES = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
      'text/plain',
      'image/png',
      'image/jpeg',
    ];
    if (!ALLOWED_MIME_TYPES.includes(parsed.data.mimeType)) {
      return NextResponse.json(
        { error: `Unsupported file type: ${parsed.data.mimeType}. Allowed: PDF, DOCX, TXT, PNG, JPEG.` },
        { status: 400 },
      );
    }

    const document = await prisma.document.create({
      data: {
        title: parsed.data.title,
        contentHash: parsed.data.contentHash,
        mimeType: parsed.data.mimeType,
        privacyMode: parsed.data.privacyMode,
        chainId: parsed.data.chainId,
        createdByEntityId: body.createdByEntityId || '00000000-0000-0000-0000-000000000001',
      },
    });

    return NextResponse.json(document, { status: 201 });
  } catch (error) {
    console.error('POST /api/documents error:', error);

    // Prisma foreign key constraint — entity doesn't exist
    if (
      error instanceof Error &&
      'code' in error &&
      (error as Record<string, unknown>).code === 'P2003'
    ) {
      return NextResponse.json(
        { error: 'Entity not found. The entity ID you specified does not exist. Seed a demo entity first.' },
        { status: 404 },
      );
    }

    // Prisma unique constraint
    if (
      error instanceof Error &&
      'code' in error &&
      (error as Record<string, unknown>).code === 'P2002'
    ) {
      return NextResponse.json(
        { error: 'A document with this hash already exists.' },
        { status: 409 },
      );
    }

    return NextResponse.json(
      {
        error: 'Internal server error',
        detail: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const queryEntityId = searchParams.get('entityId');

    // Use session entityId as fallback (demo-friendly)
    let entityId = queryEntityId;
    if (!entityId) {
      const session = await getSession();
      if (session.authenticated) {
        entityId = session.entityId ?? null;
      }
    }

    if (!entityId) {
      return NextResponse.json(
        { error: 'entityId query parameter is required (or log in first)' },
        { status: 400 },
      );
    }

    const documents = await prisma.document.findMany({
      where: { createdByEntityId: entityId! },
      orderBy: { createdAt: 'desc' },
      include: {
        signatures: true,
        attestations: true,
      },
    });

    return NextResponse.json(documents);
  } catch (error) {
    console.error('GET /api/documents error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
