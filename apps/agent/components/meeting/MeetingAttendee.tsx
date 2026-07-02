'use client';

import { useState, useRef, useCallback } from 'react';
import type { MeetingSessionData, MeetingSharedDocument } from '@signet/shared';

interface MeetingAttendeeProps {
  session: MeetingSessionData;
  attendeeId: string;
  attendeeName: string;
  currentDoc: MeetingSharedDocument | null;
  onSign: (meetingDocId: string, stylusSignature: string) => Promise<void>;
  onSaveNotes: (notes: string) => Promise<void>;
}

export function MeetingAttendee({
  session,
  attendeeId,
  attendeeName,
  currentDoc,
  onSign,
  onSaveNotes,
}: MeetingAttendeeProps) {
  const [viewMode, setViewMode] = useState<'live' | 'docs' | 'notes'>('live');
  const [notes, setNotes] = useState('');
  const [signing, setSigning] = useState(false);
  const [signatureError, setSignatureError] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const notesSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Canvas drawing handlers
  const startDrawing = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    setIsDrawing(true);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0]!.clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0]!.clientY : e.clientY;
    ctx.beginPath();
    ctx.moveTo(clientX - rect.left, clientY - rect.top);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
  }, []);

  const draw = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0]!.clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0]!.clientY : e.clientY;
    ctx.lineTo(clientX - rect.left, clientY - rect.top);
    ctx.stroke();
  }, [isDrawing]);

  const stopDrawing = useCallback(() => setIsDrawing(false), []);

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  // Submit signature
  const handleSign = useCallback(async (meetingDocId: string) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setSignatureError(null);
    setSigning(true);

    try {
      // Convert canvas to SVG data string
      const svgData = canvas.toDataURL('image/png');
      await onSign(meetingDocId, svgData);
      clearCanvas();
    } catch {
      setSignatureError('Failed to submit signature');
    } finally {
      setSigning(false);
    }
  }, [onSign]);

  // Notes with debounced save
  const handleNotesChange = useCallback((value: string) => {
    setNotes(value);
    if (notesSaveTimer.current) clearTimeout(notesSaveTimer.current);
    notesSaveTimer.current = setTimeout(() => {
      onSaveNotes(value);
    }, 1500);
  }, [onSaveNotes]);

  // Find the attendee's own signed docs
  const myData = session.attendees.find((a) => a.id === attendeeId);
  const mySignedDocs = new Set(myData?.signedDocumentIds ?? []);
  const signableDoc = currentDoc && !mySignedDocs.has(currentDoc.id)
    ? currentDoc
    : session.documents.filter((d) => d.signingActive && !mySignedDocs.has(d.id))[0] ?? null;

  return (
    <div className="space-y-6">
      {/* Top Bar */}
      <div className="signet-card">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-mono text-sm text-white/60 uppercase tracking-wider">
              Attendee View
            </h3>
            <p className="mt-1 font-mono text-xs text-white/30">
              Signed in as {attendeeName}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setViewMode('live')}
              className={`rounded-lg border px-3 py-1.5 font-mono text-xs transition ${
                viewMode === 'live'
                  ? 'border-white/40 bg-white/10 text-white'
                  : 'border-white/10 text-white/30 hover:border-white/20'
              }`}
            >
              ● Live
            </button>
            <button
              onClick={() => setViewMode('docs')}
              className={`rounded-lg border px-3 py-1.5 font-mono text-xs transition ${
                viewMode === 'docs'
                  ? 'border-white/40 bg-white/10 text-white'
                  : 'border-white/10 text-white/30 hover:border-white/20'
              }`}
            >
              Docs ({session.documents.length})
            </button>
            <button
              onClick={() => setViewMode('notes')}
              className={`rounded-lg border px-3 py-1.5 font-mono text-xs transition ${
                viewMode === 'notes'
                  ? 'border-white/40 bg-white/10 text-white'
                  : 'border-white/10 text-white/30 hover:border-white/20'
              }`}
            >
              Notes
            </button>
          </div>
        </div>
      </div>

      {/* LIVE VIEW — Host-controlled signing */}
      {viewMode === 'live' && (
        <div className="space-y-4">
          {!signableDoc && !currentDoc?.signingActive && (
            <div className="signet-card text-center space-y-3 py-8">
              <div className="text-3xl">👀</div>
              <p className="font-sans text-lg text-white/60">
                Waiting for host to share a document...
              </p>
              <p className="font-mono text-xs text-white/20">
                When the host shares a document, it will appear here automatically.
              </p>
            </div>
          )}

          {/* Current signing document */}
          {signableDoc && (
            <div className="signet-card space-y-4 border-yellow-500/30 bg-yellow-500/5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-mono text-sm text-yellow-400/80">✍️ Sign Required</p>
                  <p className="font-mono text-sm text-white/80 mt-1">{signableDoc.title}</p>
                  <p className="font-mono text-[10px] text-white/20 mt-1">
                    Hash: {signableDoc.contentHash.slice(0, 16)}...
                    {signableDoc.completeness && !signableDoc.completeness.isComplete && (
                      <span className="text-yellow-400/60 ml-2">⚠ Document may be incomplete</span>
                    )}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-mono text-xs text-white/30">
                    {signableDoc.signerNames.length}/{session.attendees.length} signed
                  </p>
                </div>
              </div>

              {/* Live signer status */}
              <div className="flex flex-wrap gap-2">
                {session.attendees.map((a) => (
                  <div
                    key={a.id}
                    className={`rounded-full border px-3 py-1 font-mono text-[10px] ${
                      a.signedDocumentIds.includes(signableDoc.id)
                        ? 'border-green-500/30 bg-green-500/10 text-green-400/60'
                        : 'border-white/10 bg-white/5 text-white/30'
                    }`}
                  >
                    {a.attendeeName} {a.signedDocumentIds.includes(signableDoc.id) ? '✓' : '...'}
                  </div>
                ))}
              </div>

              {/* Signature Canvas */}
              {!mySignedDocs.has(signableDoc.id) && (
                <div className="space-y-3">
                  <p className="font-mono text-xs text-white/40">Draw your signature below</p>
                  <canvas
                    ref={canvasRef}
                    width={400}
                    height={150}
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    onTouchStart={startDrawing}
                    onTouchMove={draw}
                    onTouchEnd={stopDrawing}
                    className="w-full rounded-lg border border-white/10 bg-white/5"
                  />
                  <div className="flex gap-3">
                    <button
                      onClick={clearCanvas}
                      className="rounded-full border border-white/10 px-4 py-1.5 font-mono text-xs text-white/40 transition hover:border-white/30 hover:text-white/60"
                    >
                      Clear
                    </button>
                    <button
                      onClick={() => handleSign(signableDoc.id)}
                      disabled={signing}
                      className="rounded-full bg-white px-4 py-1.5 font-mono text-xs font-medium text-black transition hover:bg-white/90 disabled:opacity-30"
                    >
                      {signing ? 'Signing...' : 'Submit Signature'}
                    </button>
                  </div>
                  {signatureError && (
                    <p className="font-mono text-xs text-red-400/60">{signatureError}</p>
                  )}
                </div>
              )}

              {mySignedDocs.has(signableDoc.id) && (
                <div className="flex items-center gap-2 rounded-full border border-green-500/20 bg-green-500/5 px-4 py-2 font-mono text-xs text-green-400/60">
                  <span className="h-2 w-2 rounded-full bg-green-400/60" />
                  You've signed this document ✓
                </div>
              )}
            </div>
          )}

          {/* Already signed documents in this session */}
          {session.documents.filter((d) => mySignedDocs.has(d.id) && d.id !== signableDoc?.id).map((doc) => (
            <div key={doc.id} className="signet-card border-green-500/20 bg-green-500/5">
              <p className="font-mono text-xs text-green-400/60">✓ Signed</p>
              <p className="font-mono text-sm text-white/60">{doc.title}</p>
            </div>
          ))}
        </div>
      )}

      {/* DOCS VIEW — All shared documents */}
      {viewMode === 'docs' && (
        <div className="space-y-4">
          <h3 className="font-mono text-sm text-white/40 uppercase tracking-wider">
            All Shared Documents
          </h3>
          {session.documents.length === 0 && (
            <p className="font-mono text-xs text-white/20">No documents shared yet</p>
          )}
          {session.documents.map((doc) => (
            <div
              key={doc.id}
              className={`signet-card ${
                mySignedDocs.has(doc.id)
                  ? 'border-green-500/20 bg-green-500/5'
                  : doc.signingActive
                    ? 'border-yellow-500/30 bg-yellow-500/5'
                    : ''
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-mono text-sm text-white/80">{doc.title}</p>
                  <p className="font-mono text-[10px] text-white/20">
                    Hash: {doc.contentHash.slice(0, 16)}...
                  </p>
                </div>
                <div>
                  {mySignedDocs.has(doc.id) ? (
                    <span className="font-mono text-xs text-green-400/60">✓ Signed</span>
                  ) : doc.signingActive ? (
                    <span className="font-mono text-xs text-yellow-400/60">Awaiting signature</span>
                  ) : (
                    <span className="font-mono text-xs text-white/20">Pending</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* NOTES VIEW */}
      {viewMode === 'notes' && (
        <div className="signet-card space-y-3">
          <h3 className="font-mono text-sm text-white/40 uppercase tracking-wider">
            Meeting Notes
          </h3>
          <textarea
            value={notes}
            onChange={(e) => handleNotesChange(e.target.value)}
            placeholder="Take notes during the meeting..."
            className="w-full h-48 rounded-lg border border-white/10 bg-white/5 px-4 py-3 font-mono text-sm text-white/80 placeholder:text-white/20 focus:border-white/30 focus:outline-none resize-none"
          />
          <p className="font-mono text-[10px] text-white/10">
            Notes auto-save to the session
          </p>
        </div>
      )}

      {/* Status Footer */}
      <div className="signet-card">
        <div className="flex items-center justify-between font-mono text-[10px] text-white/20">
          <span>
            {mySignedDocs.size} of {session.documents.length} documents signed
          </span>
          <span>Polling every 2s — WebSocket upgrade planned</span>
        </div>
      </div>
    </div>
  );
}