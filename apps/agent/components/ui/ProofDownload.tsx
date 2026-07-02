'use client';

import { useState } from 'react';

/**
 * ProofDownload — Downloadable attestation proof.
 *
 * Takes an attestation UID and generates a proof PDF via Signet's proof API.
 * Reusable component for embedding in dashboards, agent panels, and verification UIs.
 *
 * Designed to be extractable for Avalanche BuilderKit contribution.
 */

interface ProofDownloadProps {
  /** Attestation UID to generate proof for */
  attestationUid: string;
  /** Human-readable document title */
  documentTitle?: string;
  /** Chain ID where attestation was recorded */
  chainId?: number;
  /** Optional — callback before download starts */
  onDownloadStart?: () => void;
  /** Optional — callback when download completes or fails */
  onDownloadComplete?: (success: boolean) => void;
  /** Optional — additional CSS classes */
  className?: string;
}

const CHAIN_NAMES: Record<number, string> = {
  8453: 'Base Mainnet',
  84532: 'Base Sepolia',
  43114: 'Avalanche C-Chain',
  43113: 'Avalanche Fuji',
  5042002: 'Arc Testnet',
};

export function ProofDownload({
  attestationUid,
  documentTitle,
  chainId,
  onDownloadStart,
  onDownloadComplete,
  className = '',
}: ProofDownloadProps) {
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDownload() {
    if (!attestationUid) {
      setError('No attestation UID provided.');
      return;
    }

    setDownloading(true);
    setError(null);
    onDownloadStart?.();

    try {
      const proofUrl = `/api/proof?attestationId=${encodeURIComponent(attestationUid)}`;
      const response = await fetch(proofUrl);

      if (!response.ok) {
        throw new Error(`Proof generation failed: ${response.status}`);
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);

      // Trigger download
      const a = document.createElement('a');
      a.href = url;
      a.download = `signet-attestation-proof-${attestationUid.slice(2, 14)}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      onDownloadComplete?.(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Download failed';
      setError(message);
      onDownloadComplete?.(false);
    } finally {
      setDownloading(false);
    }
  }

  const shortUid = attestationUid
    ? `${attestationUid.slice(0, 10)}...${attestationUid.slice(-6)}`
    : '';

  return (
    <div className={`rounded-xl border border-zinc-800 bg-zinc-900/50 p-6 ${className}`}>
      <h3 className="mb-3 text-sm font-semibold text-zinc-300">Download Proof</h3>

      {/* Attestation info */}
      <div className="mb-4 space-y-1 text-xs text-zinc-500">
        {documentTitle && (
          <div>
            <span className="text-zinc-600">Document: </span>
            <span className="text-zinc-400">{documentTitle}</span>
          </div>
        )}
        <div>
          <span className="text-zinc-600">Attestation: </span>
          <code className="font-mono text-zinc-400">{shortUid}</code>
        </div>
        {chainId && CHAIN_NAMES[chainId] && (
          <div>
            <span className="text-zinc-600">Chain: </span>
            <span className="text-zinc-400">{CHAIN_NAMES[chainId]}</span>
          </div>
        )}
      </div>

      {/* Download button */}
      <button
        onClick={handleDownload}
        disabled={downloading || !attestationUid}
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-amber-500/10 px-4 py-3 text-sm font-semibold text-amber-400 transition-colors hover:bg-amber-500/20 disabled:opacity-40"
      >
        {downloading ? (
          <>
            <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
            Generating Proof PDF...
          </>
        ) : (
          <>
            <svg
              className="h-4 w-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Download Attestation Proof PDF
          </>
        )}
      </button>

      {/* Error */}
      {error && (
        <div className="mt-3 rounded-lg border border-red-500/20 bg-red-500/5 px-3 py-2 text-xs text-red-400">
          {error}
        </div>
      )}

      {/* Info */}
      <p className="mt-3 text-[11px] text-zinc-600">
        A4 PDF with attestation UID, document hash, timestamp, chain info, and EASscan verification
        URL. Court-admissible proof of on-chain attestation.
      </p>
    </div>
  );
}
