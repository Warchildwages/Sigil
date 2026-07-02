// @ts-nocheck  
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@sigil/db';
import type { CreateMeetingInput, MeetingSessionData } from '@sigil/shared';

function generateJoinCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as CreateMeetingInput;

    if (!body.title?.trim() || !body.hostName?.trim()) {
      return NextResponse.json(
        { error: 'title and hostName are required' },
        { status: 400 }
      );
    }

    // Generate unique join code
    let shortJoinCode: string;
    let attempts = 0;
    do {
      shortJoinCode = generateJoinCode();
      const existing = await prisma.meetingSession.findUnique({
        where: { shortJoinCode },
      });
      if (!existing) break;
      attempts++;
    } while (attempts < 10);

    const session = await prisma.meetingSession.create({
      data: {
        title: body.title.trim(),
        shortJoinCode,
        hostName: body.hostName.trim(),
        chainId: 84532,
        status: 'active',
        attendees: {
          create: {
            attendeeName: body.hostName.trim(),
          },
        },
      },
      include: {
        documents: {
          include: { document: true },
          orderBy: { sharedAt: 'asc' },
        },
        attendees: {
          orderBy: { joinedAt: 'asc' },
        },
      },
    });

    const result: MeetingSessionData = {
      id: session.id,
      title: session.title,
      shortJoinCode: session.shortJoinCode,
      status: session.status as 'active',
      hostName: session.hostName,
      hostEntityId: session.hostEntityId,
      chainId: session.chainId,
      documents: session.documents.map((d: { document: { contentHash: string; mimeType: string }; id: string; documentId: string; title: string; sharedAt: Date; signingActive: boolean; signedByAll: boolean }) => ({
        id: d.id,
        documentId: d.documentId,
        title: d.title,
        contentHash: d.document.contentHash,
        mimeType: d.document.mimeType,
        sharedAt: d.sharedAt.toISOString(),
        signingActive: d.signingActive,
        signedByAll: d.signedByAll,
        signerNames: [],
      })),
      attendees: session.attendees.map((a) => ({
        id: a.id,
        attendeeName: a.attendeeName,
        stylusSignature: a.stylusSignature,
        signedDocumentIds: a.signedDocumentIds,
        notes: a.notes,
        joinedAt: a.joinedAt.toISOString(),
      })),
      attestedAt: null,
      attestationTxHash: null,
      attestationUid: null,
      createdAt: session.createdAt.toISOString(),
    };

    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    console.error('Create meeting failed:', err);
    return NextResponse.json(
      { error: 'Failed to create meeting session' },
      { status: 500 }
    );
  }
}