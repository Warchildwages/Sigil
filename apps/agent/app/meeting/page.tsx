'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import type { MeetingSessionData, MeetingSharedDocument } from '@sigil/shared';
import { MeetingHost } from '@/components/meeting/MeetingHost';
import { MeetingAttendee } from '@/components/meeting/MeetingAttendee';
import { DocumentUploader } from '@/components/DocumentUploader';
import { AIAnalysisPanel } from '@/components/AIAnalysisPanel';

type ViewMode = 'join' | 'host' | 'attendee';
type HostStep = 'setup' | 'waiting' | 'presenting' | 'signing' | 'attested';

export default function MeetingPage() {
  const params = useParams();
  const meetingId = params.id as string;

  const [viewMode, setViewMode] = useState<ViewMode>('join');
  const [attendeeName, setAttendeeName] = useState('');
  const [attendeeId, setAttendeeId] = useState<string | null>(null);
  const [session, setSession] = useState<MeetingSessionData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hostStep, setHostStep] = useState<HostStep>('setup');
  const [currentDoc, setCurrentDoc] = useState<MeetingSharedDocument | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [hash, setHash] = useState<`0x${string}` | null>(null);
  const [documentId, setDocumentId] = useState<string | null>(null);
  const sseRef = useRef<EventSource | null>(null);

  // Apply a full session snapshot (from fetch or SSE)
  const applySessionUpdate = useCallback((data: MeetingSessionData) => {
    setSession(data);
    if (data.status === 'attested') {
      setHostStep('attested');
    } else if (data.documents.length > 0 && data.documents.some((d: MeetingSharedDocument) => d.signingActive)) {
      setHostStep('signing');
    } else if (data.documents.length > 0) {
      setHostStep('presenting');
    } else if (data.attendees.length > 1) {
      setHostStep('waiting');
    }
    if (data.documents.length > 0) {
      const activeDoc = data.documents.find((d: MeetingSharedDocument) => d.signingActive) ?? null;
      setCurrentDoc(activeDoc ?? data.documents[data.documents.length - 1] ?? null);
    }
  }, []);

  // SSE real-time sync (replaces 2s polling)
  useEffect(() => {
    if (viewMode !== 'host' && viewMode !== 'attendee') return;

    // Initial snapshot
    fetch(`/api/meeting/${meetingId}`)
      .then((res) => res.json())
      .then((data: MeetingSessionData) => applySessionUpdate(data))
      .catch(() => {});

    // SSE stream for push updates
    const es = new EventSource(`/api/meeting/${meetingId}/stream`);
    sseRef.current = es;

    es.addEventListener('state_update', (e) => {
      try {
        const data = JSON.parse(e.data) as MeetingSessionData;
        applySessionUpdate(data);
      } catch { /* ignore malformed */ }
    });

    // Full re-fetch on granular events (simpler than merging)
    const refetch = () => {
      fetch(`/api/meeting/${meetingId}`)
        .then((res) => res.json())
        .then((data: MeetingSessionData) => applySessionUpdate(data))
        .catch(() => {});
    };

    es.addEventListener('attendee_joined', refetch);
    es.addEventListener('document_shared', refetch);
    es.addEventListener('signing_started', refetch);

    return () => {
      es.close();
      sseRef.current = null;
    };
  }, [viewMode, meetingId, applySessionUpdate]);

  // CREATE MEETING (host)
  const handleCreateMeeting = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch('/api/meeting', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'AllFans Onboarding — Signet NDA',
          hostName: 'Event Host',
        }),
      });
      if (!res.ok) throw new Error('Failed to create meeting');
      const data = await res.json();
      setSession(data as MeetingSessionData);
      setViewMode('host');
      setHostStep('waiting');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Create meeting failed');
    }
  }, []);

  // JOIN MEETING (attendee)
  const handleJoinMeeting = useCallback(async () => {
    setError(null);
    if (!attendeeName.trim()) {
      setError('Enter your name to join');
      return;
    }
    try {
      const res = await fetch(`/api/meeting/${meetingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'join',
          attendeeName: attendeeName.trim(),
        }),
      });
      if (!res.ok) throw new Error('Failed to join meeting');
      const data = await res.json();
      setAttendeeId(data.attendeeId);
      setViewMode('attendee');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Join meeting failed');
    }
  }, [attendeeName, meetingId]);

  // HOST: Share document
  const handleShareDocument = useCallback(async (docId: string) => {
    setError(null);
    try {
      const res = await fetch(`/api/meeting/${meetingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'share',
          documentId: docId,
        }),
      });
      if (!res.ok) throw new Error('Failed to share document');
      setHostStep('presenting');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Share document failed');
    }
  }, [meetingId]);

  // HOST: Start signing round
  const handleStartSigning = useCallback(async (meetingDocId: string) => {
    setError(null);
    try {
      const res = await fetch(`/api/meeting/${meetingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'start_signing',
          meetingDocumentId: meetingDocId,
        }),
      });
      if (!res.ok) throw new Error('Failed to start signing');
      setHostStep('signing');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Start signing failed');
    }
  }, [meetingId]);

  // ATTENDEE: Submit signature
  const handleSignDocument = useCallback(async (meetingDocId: string, sig: string) => {
    if (!attendeeId) return;
    setError(null);
    try {
      const res = await fetch(`/api/meeting/${meetingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'sign',
          meetingDocumentId: meetingDocId,
          attendeeId,
          stylusSignature: sig,
        }),
      });
      if (!res.ok) throw new Error('Failed to sign');
      // SSE pushes state_update automatically
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign failed');
    }
  }, [meetingId, attendeeId]);

  // ATTENDEE: Save notes
  const handleSaveNotes = useCallback(async (notes: string) => {
    if (!attendeeId) return;
    try {
      await fetch(`/api/meeting/${meetingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'save_notes',
          attendeeId,
          notes,
        }),
      });
    } catch {
      // silent fail
    }
  }, [meetingId, attendeeId]);

  // HOST: Final attest
  const handleAttest = useCallback(async () => {
    setError(null);
    try {
      const mockUid = `0x${Array.from({ length: 64 }, () =>
        Math.floor(Math.random() * 16).toString(16)
      ).join('')}`;

      const res = await fetch(`/api/meeting/${meetingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'attest',
          attestationUid: mockUid,
          attestationTxHash: `0x${Array.from({ length: 64 }, () =>
            Math.floor(Math.random() * 16).toString(16)
          ).join('')}`,
        }),
      });
      if (!res.ok) throw new Error('Failed to attest');
      // SSE pushes state_update automatically
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Attest failed');
    }
  }, [meetingId]);

  // DOCUMENT UPLOAD via existing demo flow
  const handleHash = useCallback(async (docHash: `0x${string}`, uploadedFile: File) => {
    setHash(docHash);
    setFile(uploadedFile);
    setError(null);

    try {
      const res = await fetch('/api/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: uploadedFile.name.replace(/\.[^.]+$/, ''),
          contentHash: docHash,
          mimeType: uploadedFile.type || 'application/pdf',
          privacyMode: 'public',
          chainId: 84532,
          createdByEntityId: '00000000-0000-0000-0000-000000000001',
        }),
      });
      if (!res.ok) throw new Error('Failed to create document');
      const doc = await res.json();
      setDocumentId(doc.id);
      await handleShareDocument(doc.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save document');
    }
  }, [handleShareDocument]);

  return (
    <main className="flex min-h-screen flex-col items-center px-4 py-8">
      <div className="w-full max-w-3xl space-y-6">
        {/* Header */}
        <div className="text-center">
          <h1 className="font-mono text-sm tracking-[0.3em] text-white/40 uppercase">
            Signet Meeting Room
          </h1>
          {session && (
            <p className="mt-1 font-sans text-xl font-light text-white/80">
              {session.title}
            </p>
          )}
          {session && viewMode !== 'join' && (
            <p className="mt-2 font-mono text-xs text-white/30">
              Join Code: <span className="text-white/60 text-lg tracking-widest">{session.shortJoinCode}</span>
            </p>
          )}
        </div>

        {/* Error Display */}
        {error && (
          <div className="rounded-lg border border-red-500/20 bg-red-500/5 px-4 py-3 font-mono text-xs text-red-400/60">
            {error}
          </div>
        )}

        {/* JOIN VIEW */}
        {viewMode === 'join' && (
          <div className="signet-card space-y-4 text-center">
            <p className="font-sans text-lg text-white/80">Join Meeting</p>
            <p className="font-mono text-xs text-white/40">
              Enter your name to join this signing session
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <input
                type="text"
                value={attendeeName}
                onChange={(e) => setAttendeeName(e.target.value)}
                placeholder="Your name"
                onKeyDown={(e) => e.key === 'Enter' && handleJoinMeeting()}
                className="rounded-lg border border-white/10 bg-white/5 px-4 py-3 font-mono text-sm text-white/80 placeholder:text-white/20 focus:border-white/30 focus:outline-none"
                autoFocus
              />
              <button
                onClick={handleJoinMeeting}
                className="rounded-lg bg-white/10 px-6 py-3 font-mono text-sm text-white/80 transition hover:bg-white/20"
              >
                Join as Attendee
              </button>
              <button
                onClick={handleCreateMeeting}
                className="rounded-lg bg-white px-6 py-3 font-mono text-sm font-medium text-black transition hover:bg-white/90"
              >
                Start as Host
              </button>
            </div>
          </div>
        )}

        {/* HOST VIEW */}
        {viewMode === 'host' && session && (
          <MeetingHost
            session={session}
            hostStep={hostStep}
            currentDoc={currentDoc}
            onShareDocument={handleShareDocument}
            onStartSigning={handleStartSigning}
            onAttest={handleAttest}
            error={error}
            setError={setError}
          />
        )}

        {/* ATTENDEE VIEW */}
        {viewMode === 'attendee' && session && attendeeId && (
          <MeetingAttendee
            session={session}
            attendeeId={attendeeId}
            attendeeName={attendeeName}
            currentDoc={currentDoc}
            onSign={handleSignDocument}
            onSaveNotes={handleSaveNotes}
          />
        )}

        {/* HOST: Document Upload */}
        {viewMode === 'host' && hostStep === 'setup' && (
          <div className="space-y-4">
            <DocumentUploader onHash={handleHash} />
            {hash && documentId && (
              <div className="flex items-center gap-2 rounded-full border border-green-500/20 bg-green-500/5 px-4 py-2 font-mono text-xs text-green-400/60">
                <span className="h-2 w-2 rounded-full bg-green-400/60" />
                Document ready — shared to meeting
              </div>
            )}
          </div>
        )}

        {/* AI Analysis (host view, after upload) */}
        {viewMode === 'host' && hash && file && hostStep === 'presenting' && (
          <AIAnalysisPanel documentHash={hash} fileName={file.name} file={file} />
        )}

        {/* Attestation Complete */}
        {viewMode === 'host' && hostStep === 'attested' && session?.attestationUid && (
          <div className="signet-card space-y-4 text-center">
            <div className="text-4xl">✅</div>
            <h3 className="font-sans text-xl font-light text-white/90">Meeting Attested</h3>
            <p className="font-mono text-xs text-white/40 break-all">
              Attestation UID: {session.attestationUid}
            </p>
            <p className="font-mono text-xs text-white/40">
              All signatures are permanently recorded on-chain.
            </p>
          </div>
        )}

        {/* Back Link */}
        <div className="text-center">
          <Link
            href="/"
            className="font-mono text-xs text-white/20 transition hover:text-white/40"
          >
            ← Back to Signet
          </Link>
        </div>

        {/* SSE status */}
        <div className="text-center">
          <span className="font-mono text-[10px] text-white/10">
            SSE real-time sync — no polling
          </span>
        </div>
      </div>
    </main>
  );
}