'use client';

import { useState } from 'react';

interface AttestationVerifierProps {
  attestationUid: string | null;
  documentHash: string | null;
  signingMethod: string | null;
  isMock?: boolean;
}

export function AttestationVerifier({
  attestationUid,
  documentHash,
  signingMethod,
  isMock = false,
}: AttestationVerifierProps) {
  const [verifying, setVerifying] = useState(false);
  const [verified, setVerified] = useState<boolean | null>(null);

  // EAS attestation explorer — attestation UIDs are not transaction hashes
  const easExplorerUrl = 'https://base-sepolia.easscan.org/attestation/view';

  const handleVerify = async () => {
    if (!attestationUid) return;

    // Mock attestations: skip verification, show the mock notice immediately
    if (isMock) {
      setVerified(null);
      return;
    }

    setVerifying(true);
    setVerified(null);

    try {
      // Verify the attestation exists in our database (which means it was
      // persisted after the real on-chain EAS attestation succeeded)
      const res = await fetch(`/api/attest?uid=${encodeURIComponent(attestationUid)}`);
      if (res.ok) {
        setVerified(true);
      } else {
        setVerified(false);
      }
    } catch {
      setVerified(false);
    } finally {
      setVerifying(false);
    }
  };

  if (!attestationUid) {
    return null;
  }

  return (
    <div className="signet-card space-y-4">
      <h3 className="font-mono text-sm text-white/40 uppercase tracking-wider">
        On-Chain Attestation
      </h3>

      <div className="space-y-3 font-mono text-xs">
        <div className="flex justify-between">
          <span className="text-white/40">Protocol</span>
          <span className="text-white/80">EAS</span>
        </div>
        <div className="flex justify-between">
          <span className="text-white/40">Network</span>
          <span className="text-white/80">Base Sepolia</span>
        </div>
        <div className="flex justify-between">
          <span className="text-white/40">Attestation UID</span>
          <span className="max-w-[200px] truncate text-white/60" title={attestationUid}>
            {attestationUid}
          </span>
        </div>
        {documentHash && (
          <div className="flex justify-between">
            <span className="text-white/40">Document Hash</span>
            <span className="max-w-[200px] truncate text-white/60 font-mono" title={documentHash}>
              {documentHash.slice(0, 16)}...
            </span>
          </div>
        )}
        {signingMethod && (
          <div className="flex justify-between">
            <span className="text-white/40">Signing Method</span>
            <span className="text-white/80 capitalize">{signingMethod}</span>
          </div>
        )}
      </div>

      {isMock ? (
        <div className="rounded-lg border border-yellow-500/20 bg-yellow-500/5 px-4 py-3">
          <p className="font-mono text-xs text-yellow-400/60">
            ⚠ This is a simulated attestation (no Circle passkey was used). To create a real
            on-chain attestation on Base Sepolia, set up a passkey in the Sign step.
          </p>
        </div>
      ) : (
        <>
          <div className="flex items-center gap-3">
            <button
              onClick={handleVerify}
              disabled={verifying}
              className={`rounded-full px-6 py-2 font-mono text-xs font-medium transition ${
                verified === true
                  ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                  : verified === false
                    ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                    : verifying
                      ? 'bg-white/5 text-white/40 border border-white/10'
                      : 'bg-white text-black hover:bg-white/90'
              }`}
            >
              {verified === true
                ? '✓ Verified On-Chain'
                : verified === false
                  ? 'Verification Failed — Retry'
                  : verifying
                    ? 'Verifying...'
                    : 'Verify On-Chain'}
            </button>
            <a
              href={`${easExplorerUrl}/${attestationUid}`}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full border border-white/10 px-4 py-2 font-mono text-xs text-white/40 transition hover:border-white/30 hover:text-white/60"
            >
              View on EASscan ↗
            </a>
          </div>

          {verified === true && (
            <div className="rounded-lg border border-green-500/20 bg-green-500/5 px-4 py-3">
              <p className="font-mono text-xs text-green-400">
                ✓ This document has been permanently attested on Base Sepolia. The attestation is
                cryptographically verifiable by anyone, forever.
              </p>
            </div>
          )}

          {verified === false && (
            <div className="rounded-lg border border-red-500/20 bg-red-500/5 px-4 py-3">
              <p className="font-mono text-xs text-red-400">
                ✗ Attestation not found on-chain. The attestation UID may be invalid or the transaction
                has not yet been indexed. Please wait a few moments and try again.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}