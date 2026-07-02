'use client';

import { useState } from 'react';

export type ReviewErrorType =
  | 'llm_unavailable'
  | 'analysis_failed'
  | 'attestation_failed'
  | 'upload_failed'
  | 'network';

export interface ReviewPageError {
  type: ReviewErrorType;
  message: string;
  detail?: string;
  retryable: boolean;
}

const ERROR_ICONS: Record<ReviewErrorType, string> = {
  llm_unavailable: '🤖',
  analysis_failed: '🔍',
  attestation_failed: '⛓️',
  upload_failed: '📤',
  network: '🌐',
};

const ERROR_COLORS: Record<ReviewErrorType, string> = {
  llm_unavailable: 'border-amber-500/30 bg-amber-500/5',
  analysis_failed: 'border-red-500/30 bg-red-500/5',
  attestation_failed: 'border-red-500/30 bg-red-500/5',
  upload_failed: 'border-orange-500/30 bg-orange-500/5',
  network: 'border-red-500/30 bg-red-500/5',
};

interface ErrorBannerProps {
  error: ReviewPageError;
  onRetry?: () => void;
}

export function ErrorBanner({ error, onRetry }: ErrorBannerProps) {
  const [showDetail, setShowDetail] = useState(false);

  return (
    <div
      className={`rounded-xl border px-6 py-5 ${ERROR_COLORS[error.type] || ERROR_COLORS.network}`}
    >
      <div className="flex items-start gap-3">
        <span className="text-xl leading-none mt-0.5">{ERROR_ICONS[error.type] || '⚠️'}</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm text-white/80">{error.message}</p>

          {error.detail && (
            <>
              <button
                onClick={() => setShowDetail(!showDetail)}
                className="mt-2 font-mono text-xs text-white/30 hover:text-white/50 transition-colors"
              >
                {showDetail ? 'Hide details' : 'Show details'}
              </button>
              {showDetail && (
                <pre className="mt-2 overflow-x-auto rounded-lg bg-black/30 px-3 py-2 font-mono text-xs text-white/40 whitespace-pre-wrap break-words">
                  {error.detail}
                </pre>
              )}
            </>
          )}
        </div>

        {error.retryable && onRetry && (
          <button
            onClick={onRetry}
            className="shrink-0 rounded-lg border border-white/10 bg-white/5 px-4 py-2 font-mono text-xs text-white/60 transition hover:border-white/20 hover:bg-white/10 hover:text-white/80"
          >
            Retry
          </button>
        )}
      </div>
    </div>
  );
}
