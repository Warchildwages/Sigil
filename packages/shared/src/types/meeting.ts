/** Meeting session types for Signet real-time document signing rooms */

export interface MeetingParticipant {
  id: string;
  name: string;
  role: 'host' | 'attendee';
}

export interface MeetingSharedDocument {
  id: string;
  documentId: string;
  title: string;
  contentHash: string;
  mimeType: string;
  sharedAt: string;
  signingActive: boolean;
  signedByAll: boolean;
  signerNames: string[];
  completeness?: {
    isComplete: boolean;
    missingElements: string[];
    warnings: string[];
  } | null;
}

export interface MeetingAttendeeData {
  id: string;
  attendeeName: string;
  stylusSignature: string | null;
  signedDocumentIds: string[];
  notes: string | null;
  joinedAt: string;
}

export interface MeetingSessionData {
  id: string;
  title: string;
  shortJoinCode: string;
  status: 'active' | 'attested' | 'cancelled';
  hostName: string;
  hostEntityId: string | null;
  chainId: number;
  documents: MeetingSharedDocument[];
  attendees: MeetingAttendeeData[];
  attestedAt: string | null;
  attestationTxHash: string | null;
  attestationUid: string | null;
  createdAt: string;
}

export interface CreateMeetingInput {
  title: string;
  hostName: string;
}

export interface JoinMeetingInput {
  shortJoinCode: string;
  attendeeName: string;
}

export interface ShareDocumentInput {
  documentId: string;
  title: string;
}

export interface SignDocumentInput {
  meetingDocumentId: string;
  attendeeId: string;
  stylusSignature: string; // SVG string of drawn signature
}

export interface SaveNotesInput {
  attendeeId: string;
  notes: string;
}

export interface MeetingSSEEvent {
  type: 'meeting_updated' | 'document_shared' | 'signing_round_started' | 'signature_submitted' | 'meeting_attested';
  data: unknown;
  timestamp: string;
}