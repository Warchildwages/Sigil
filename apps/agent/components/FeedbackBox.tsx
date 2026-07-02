'use client';

import { useState } from 'react';

interface FeedbackBoxProps {
  pageUrl: string;
}

export function FeedbackBox({ pageUrl }: FeedbackBoxProps) {
  const [expanded, setExpanded] = useState(false);
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!message.trim()) return;
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pageUrl,
          message: message.trim(),
          email: email.trim() || null,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Failed to submit feedback' }));
        throw new Error(err.error || 'Failed to submit feedback');
      }

      setSubmitted(true);
      setMessage('');
      setEmail('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit feedback');
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="signet-card text-center">
        <p className="font-mono text-xs text-green-400/60">✓ Feedback received. Thank you.</p>
      </div>
    );
  }

  return (
    <div className="signet-card space-y-3">
      {!expanded ? (
        <button
          onClick={() => setExpanded(true)}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-white/10 px-4 py-3 font-mono text-xs text-white/30 transition hover:border-white/20 hover:text-white/50"
        >
          <span>💬</span>
          <span>Send Feedback</span>
        </button>
      ) : (
        <>
          <div className="flex items-center justify-between">
            <h4 className="font-mono text-xs text-white/40 uppercase tracking-wider">
              Send Feedback
            </h4>
            <button
              onClick={() => setExpanded(false)}
              className="font-mono text-xs text-white/20 transition hover:text-white/40"
            >
              ✕
            </button>
          </div>

          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="What's on your mind? Suggestions, bugs, ideas..."
            rows={3}
            className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 font-mono text-xs text-white/70 placeholder:text-white/15 focus:border-white/30 focus:outline-none resize-none"
          />

          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email (optional)"
            className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 font-mono text-xs text-white/70 placeholder:text-white/15 focus:border-white/30 focus:outline-none"
          />

          {error && (
            <p className="font-mono text-xs text-red-400/60">{error}</p>
          )}

          <button
            onClick={handleSubmit}
            disabled={submitting || !message.trim()}
            className="w-full rounded-full bg-white px-4 py-2 font-mono text-xs font-medium text-black transition hover:bg-white/90 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            {submitting ? 'Sending...' : 'Submit Feedback'}
          </button>
        </>
      )}
    </div>
  );
}