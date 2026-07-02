// @ts-nocheck  
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@sigil/db';
import type { MeetingSessionData } from '@sigil/shared';
import { broadcastToRoom } from '@/lib/meeting-events';

function serializeSession(session: {
  id: string;
  title: string;
  shortJoinCode: string;
  status: string;
  hostName: string;
  hostEntityId: string | null;
  chainId: number;
  attestedAt: Date | null;
  attestationTxHash: string | null;
  attestationUid: string | null;
  createdAt: Date;
  documents: Array<{
    id: string;
    documentId: string;
    title: string;
    sharedAt: Date;
    signingActive: boolean;
    signedByAll: boolean;
    document: { contentHash: string; mimeType: string };
  }>;
  attendees: Array<{
    id: string;
    attendeeName: string;
    stylusSignature: string | null;
    signedDocumentIds: string[];
    notes: string | null;
    joinedAt: Date;
  }>;
}): MeetingSessionData {
  return {
    id: session.id,
    title: session.title,
    shortJoinCode: session.shortJoinCode,
    status: session.status as 'active' | 'attested' | 'cancelled',
    hostName: session.hostName,
    hostEntityId: session.hostEntityId,
    chainId: session.chainId,
    documents: session.documents.map((d) => ({
      id: d.id,
      documentId: d.documentId,
      title: d.title,
      contentHash: d.document.contentHash,
      mimeType: d.document.mimeType,
      sharedAt: d.sharedAt.toISOString(),
      signingActive: d.signingActive,
      signedByAll: d.signedByAll,
      signerNames: session.attendees
        .filter((a) => a.signedDocumentIds.includes(d.id))
        .map((a) => a.attendeeName),
    })),
    attendees: session.attendees.map((a) => ({
      id: a.id,
      attendeeName: a.attendeeName,
      stylusSignature: a.stylusSignature,
      signedDocumentIds: a.signedDocumentIds,
      notes: a.notes,
      joinedAt: a.joinedAt.toISOString(),
    })),
    attestedAt: session.attestedAt?.toISOString() ?? null,
    attestationTxHash: session.attestationTxHash,
    attestationUid: session.attestationUid,
    createdAt: session.createdAt.toISOString(),
  };
}

const includeAll = {
  documents: {
    include: { document: true },
    orderBy: { sharedAt: 'asc' as const },
  },
  attendees: {
    orderBy: { joinedAt: 'asc' as const },
  },
};

/** GET — fetch meeting session by ID */
export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await prisma.meetingSession.findUnique({
      where: { id: params.id },
      include: includeAll,
    });

    if (!session) {
      return NextResponse.json({ error: 'Meeting not found' }, { status: 404 });
    }

    return NextResponse.json(serializeSession(session as Awaited<ReturnType<typeof prisma.meetingSession.findUnique>> & { documents: Array<{ id: string; documentId: string; title: string; sharedAt: Date; signingActive: boolean; signedByAll: boolean; document: { contentHash: string; mimeType: string } }>; attendees: Array<{ id: string; attendeeName: string; stylusSignature: string | null; signedDocumentIds: string[]; notes: string | null; joinedAt: Date }> }));
  } catch (err) {
    console.error('Get meeting failed:', err);
    return NextResponse.json({ error: 'Failed to fetch meeting' }, { status: 500 });
  }
}

/** PATCH — join, share, sign, attest based on action field */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { action, ...data } = body as { action: string; [key: string]: unknown };

    if (!action) {
      return NextResponse.json({ error: 'action field is required' }, { status: 400 });
    }

    // Verify session exists
    const existing = await prisma.meetingSession.findUnique({
      where: { id: params.id },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Meeting not found' }, { status: 404 });
    }
    if (existing.status !== 'active') {
      return NextResponse.json({ error: `Meeting is ${existing.status}` }, { status: 400 });
    }

    switch (action) {
      case 'join': {
        if (!data.attendeeName) {
          return NextResponse.json({ error: 'attendeeName is required' }, { status: 400 });
        }
        const attendee = await prisma.meetingAttendee.create({
          data: {
            meetingSessionId: params.id,
            attendeeName: (data.attendeeName as string).trim(),
          },
        });
        const result = {
          attendeeId: attendee.id,
          attendeeName: attendee.attendeeName,
          joinedAt: attendee.joinedAt.toISOString(),
        };
        broadcastToRoom(params.id, 'attendee_joined', result);
        return NextResponse.json(result);
      }

      case 'share': {
        if (!data.documentId) {
          return NextResponse.json({ error: 'documentId is required' }, { status: 400 });
        }
        // Verify document exists
        const doc = await prisma.document.findUnique({
          where: { id: data.documentId as string },
        });
        if (!doc) {
          return NextResponse.json({ error: 'Document not found' }, { status: 404 });
        }
        const meetingDoc = await prisma.meetingDocument.create({
          data: {
            meetingSessionId: params.id,
            documentId: data.documentId as string,
            title: doc.title,
          },
          include: { document: true },
        });
        const sharedDoc = {
          id: meetingDoc.id,
          documentId: meetingDoc.documentId,
          title: meetingDoc.title,
          contentHash: meetingDoc.document.contentHash,
          mimeType: meetingDoc.document.mimeType,
          sharedAt: meetingDoc.sharedAt.toISOString(),
          signingActive: false,
          signedByAll: false,
          signerNames: [],
        };
        broadcastToRoom(params.id, 'document_shared', sharedDoc);
        return NextResponse.json(sharedDoc);
      }

      case 'start_signing': {
        if (!data.meetingDocumentId) {
          return NextResponse.json({ error: 'meetingDocumentId is required' }, { status: 400 });
        }
        const md = await prisma.meetingDocument.update({
          where: { id: data.meetingDocumentId as string },
          data: { signingActive: true },
        });
        const signingResult = { id: md.id, signingActive: md.signingActive };
        broadcastToRoom(params.id, 'signing_started', signingResult);
        return NextResponse.json(signingResult);
      }

      case 'sign': {
        if (!data.meetingDocumentId || !data.attendeeId || !data.stylusSignature) {
          return NextResponse.json(
            { error: 'meetingDocumentId, attendeeId, and stylusSignature are required' },
            { status: 400 }
          );
        }
        const attId = data.attendeeId as string;
        const att = await prisma.meetingAttendee.findUnique({ where: { id: attId } });
        if (!att || att.meetingSessionId !== params.id) {
          return NextResponse.json({ error: 'Attendee not found in this meeting' }, { status: 404 });
        }

        const updatedIds = [...new Set([...att.signedDocumentIds, data.meetingDocumentId as string])];
        await prisma.meetingAttendee.update({
          where: { id: attId },
          data: {
            stylusSignature: data.stylusSignature as string,
            signedDocumentIds: updatedIds,
          },
        });

        // Check if all attendees signed this document
        const allAttendees = await prisma.meetingAttendee.findMany({
          where: { meetingSessionId: params.id },
        });
        const allSigned = allAttendees.every((a: { signedDocumentIds: string[] }) =>
          a.signedDocumentIds.includes(data.meetingDocumentId as string)
        );
        if (allSigned) {
          await prisma.meetingDocument.update({
            where: { id: data.meetingDocumentId as string },
            data: { signedByAll: true, signingActive: false },
          });
          // Update document status
          const md = await prisma.meetingDocument.findUnique({
            where: { id: data.meetingDocumentId as string },
            include: { document: true },
          });
          if (md) {
            await prisma.document.update({
              where: { id: md.documentId },
              data: { status: 'signed' },
            });
          }
        }

        const session = await prisma.meetingSession.findUnique({
          where: { id: params.id },
          include: includeAll,
        });
        const updatedSession = serializeSession(session as unknown as Parameters<typeof serializeSession>[0]);
        broadcastToRoom(params.id, 'state_update', updatedSession);
        return NextResponse.json(updatedSession);
      }

      case 'attest': {
        if (!data.attestationUid) {
          return NextResponse.json({ error: 'attestationUid is required' }, { status: 400 });
        }
        const updated = await prisma.meetingSession.update({
          where: { id: params.id },
          data: {
            status: 'attested',
            attestationUid: data.attestationUid as string,
            attestationTxHash: data.attestationTxHash as string | undefined,
            attestedAt: new Date(),
          },
          include: includeAll,
        });
        const attestedSession = serializeSession(updated as unknown as Parameters<typeof serializeSession>[0]);
        broadcastToRoom(params.id, 'state_update', attestedSession);
        return NextResponse.json(attestedSession);
      }

      case 'save_notes': {
        if (!data.attendeeId || data.notes === undefined) {
          return NextResponse.json(
            { error: 'attendeeId and notes are required' },
            { status: 400 }
          );
        }
        await prisma.meetingAttendee.update({
          where: { id: data.attendeeId as string },
          data: { notes: data.notes as string },
        });
        return NextResponse.json({ success: true });
      }

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }
  } catch (err) {
    console.error('Meeting action failed:', err);
    return NextResponse.json(
      { error: 'Failed to process meeting action' },
      { status: 500 }
    );
  }
}