import { NextResponse } from 'next/server';
import { prisma } from '@signet/db';

export async function GET(
  _request: Request,
  { params }: { params: { id: string } },
) {
  try {
    const document = await prisma.document.findUnique({
      where: { id: params.id },
      include: {
        signatures: {
          include: {
            entity: true,
            officeholder: true,
          },
        },
        attestations: true,
      },
    });

    if (!document) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 },
      );
    }

    return NextResponse.json(document);
  } catch (error) {
    console.error('GET /api/documents/[id] error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}