'use client';

import { useState } from 'react';
import type { MeetingSessionData, MeetingSharedDocument } from '@signet/shared';

interface MeetingHostProps {
  session: MeetingSessionData;
  hostStep: 'setup' | 'waiting' | 'presenting' | 'signing' | 'attested';
  currentDoc: MeetingSharedDocument | null;
  onShareDocument: (docId: string) => Promise<void>;
  onStartSigning: (meetingDocId: string) => Promise<void>;
  onAttest: () => Promise<void>;
  error: string | null;
  setError: (msg: string | null) => void;
}

export function MeetingHost({
  session,
  hostStep,
  currentDoc,
  onShareDocument,
  onStartSigning,
  onAttest,
  error,
  setError,
}: MeetingHostProps) {
  const [submitting, setSubmitting] = useState(false);

  const handleStartSigning = async (docId: string) => {
    setError(null);
    setSubmitting(true);
    try {
      await onStartSigning(docId);
    } finally {
      setSubmitting(false);
    }
  };

  const handleAttest = async () => {
    setError(null);
    setSubmitting(true);
    try {
      await onAttest();
    } finally {
      setSubmitting(false);
    }
  };

  const signedAttendeeCount = (doc: MeetingSharedDocument) => doc.signerNames.length;
  const totalAttendeeCount = session.attendees.length;

  return (
    <div className="space-y-6">
      {/* Host Toolbar */}
      <div className="signet-card space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-mono text-sm text-white/60 uppercase tracking-wider">
              Host Dashboard
            </h3>
            <p className="mt-1 font-mono text-xs text-white/30">
              Step: {hostStep.replace('_', ' ')}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 font-mono text-xs text-white/30">
              <span className="h-2 w-2 rounded-full bg-green-400/60" />
              {session.attendees.length} in room
            </div>
          </div>
        </div>

        {/* Step Guide */}
        <div className="flex items-center gap-2">
          {['setup', 'waiting', 'presenting', 'signing', 'attested'].map((step, i) => (
            <div key={step} className="flex items-center gap-1">
              <div
                className={`h-2 w-2 rounded-full transition ${
                  hostStep === step
                    ? 'bg-white'
                    : ['setup', 'waiting', 'presenting', 'signing', 'attested'].indexOf(hostStep) > i
                      ? 'bg-white/40'
                      : 'bg-white/10'
                }`}
              />
              {i < 4 && <div className="h-px w-4 bg-white/10" />}
            </div>
          ))}
        </div>
      </div>

      {/* Waiting for attendees */}
      {hostStep === 'waiting' && (
        <div className="signet-card text-center space-y-3 py-8">
          <div className="text-3xl">⏳</div>
          <p className="font-sans text-lg text-white/60">
            Waiting for attendees to join...
          </p>
          <p className="font-mono text-xs text-white/30">
            Share this join code: <span className="text-white/60 text-lg tracking-widest">{session.shortJoinCode}</span>
          </p>
        </div>
      )}

      {/* Document List (presenting/signing) */}
      {(hostStep === 'presenting' || hostStep === 'signing') && (
        <div className="space-y-4">
          <h3 className="font-mono text-sm text-white/40 uppercase tracking-wider">
            Shared Documents
          </h3>
          {session.documents.length === 0 && (
            <p className="font-mono text-xs text-white/20">No documents shared yet</p>
          )}
          {session.documents.map((doc) => (
            <div
              key={doc.id}
              className={`signet-card space-y-3 transition ${
                doc.signingActive ? 'border-yellow-500/30 bg-yellow-500/5' : ''
              } ${doc.signedByAll ? 'border-green-500/20 bg-green-500/5' : ''}`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-mono text-sm text-white/80">{doc.title}</p>
                  <p className="font-mono text-[10px] text-white/20">Hash: {doc.contentHash.slice(0, 16)}...</p>
                </div>
                <div className="flex items-center gap-3">
                  {/* Signing progress */}
                  {doc.signingActive && (
                    <span className="font-mono text-xs text-yellow-400/60">
                      {signedAttendeeCount(doc)}/{totalAttendeeCount} signed
                    </span>
                  )}
                  {doc.signedByAll ? (
                    <span className="font-mono text-xs text-green-400/60">✓ All Signed</span>
                  ) : doc.signingActive ? null : (
                    <button
                      onClick={() => handleStartSigning(doc.id)}
                      disabled={submitting || session.attendees.length < 2}
                      className="rounded-full bg-white px-4 py-1.5 font-mono text-xs font-medium text-black transition hover:bg-white/90 disabled:opacity-30"
                    >
                      Start Signing
                    </button>
                  )}
                </div>
              </div>

              {/* Signer list */}
              {doc.signingActive && (
                <div className="flex flex-wrap gap-2">
                  {session.attendees.map((a) => (
                    <div
                      key={a.id}
                      className={`rounded-full border px-3 py-1 font-mono text-[10px] ${
                        a.signedDocumentIds.includes(doc.id)
                          ? 'border-green-500/30 bg-green-500/10 text-green-400/60'
                          : 'border-white/10 bg-white/5 text-white/30'
                      }`}
                    >
                      {a.attendeeName} {a.signedDocumentIds.includes(doc.id) ? '✓' : '...'}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Attestation Controls */}
      {hostStep === 'signing' && currentDoc?.signedByAll && (
        <div className="signet-card text-center space-y-3">
          <p className="font-sans text-lg text-green-400/60">All parties have signed!</p>
          <button
            onClick={handleAttest}
            disabled={submitting}
            className="rounded-full bg-white px-8 py-3 font-mono text-sm font-medium text-black transition hover:bg-white/90 disabled:opacity-30"
          >
            {submitting ? 'Attesting...' : 'Attest on Base Sepolia'}
          </button>
          <p className="font-mono text-[10px] text-white/20">
            This creates a permanent on-chain record of all signatures.
          </p>
        </div>
      )}

      {/* Attendee List */}
      <div className="signet-card space-y-3">
        <h3 className="font-mono text-sm text-white/40 uppercase tracking-wider">
          Attendees ({session.attendees.length})
        </h3>
        <div className="space-y-2">
          {session.attendees.map((a) => (
            <div
              key={a.id}
              className="flex items-center justify-between rounded-lg border border-white/5 bg-white/[0.02] px-4 py-2"
            >
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-green-400/60" />
                <span className="font-mono text-sm text-white/80">{a.attendeeName}</span>
                {a.id === session.attendees[0]?.id && (
                  <span className="rounded-full border border-white/10 px-2 py-0.5 font-mono text-[10px] text-white/30">
                    Host
                  </span>
                )}
              </div>
              <span className="font-mono text-[10px] text-white/20">
                {a.signedDocumentIds.length} of {session.documents.length} docs signed
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}