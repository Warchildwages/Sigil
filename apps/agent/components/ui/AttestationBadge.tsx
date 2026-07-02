'use client';

/**
 * AttestationBadge — Reusable attestation status indicator.
 *
 * Shows attestation UID, chain info, and verification link.
 * Designed to be extractable for Avalanche BuilderKit contribution.
 *
 * Usage:
 *   <AttestationBadge
 *     attestationUid="0xabc123..."
 *     chainId={84532}
 *     chainName="Base Sepolia"
 *     explorerUrl="https://sepolia.basescan.org/tx/0xabc123..."
 *   />
 */

interface AttestationBadgeProps {
  /** EAS attestation UID */
  attestationUid: string;
  /** Chain ID where attestation was recorded */
  chainId: number;
  /** Human-readable chain name */
  chainName: string;
  /** Block explorer URL for verification */
  explorerUrl: string;
  /** Optional — timestamp of attestation */
  timestamp?: string;
  /** Optional — additional CSS classes */
  className?: string;
}

const CHAIN_COLORS: Record<number, string> = {
  8453: '#0052FF', // Base Mainnet blue
  84532: '#0052FF', // Base Sepolia blue
  43114: '#E84142', // Avalanche red
  43113: '#E84142', // Avalanche Fuji red
  5042002: '#27AE60', // Arc Testnet green
  11155111: '#8A8AFF', // Ethereum Sepolia purple
};

export function AttestationBadge({
  attestationUid,
  chainId,
  chainName,
  explorerUrl,
  timestamp,
  className = '',
}: AttestationBadgeProps) {
  const chainColor = CHAIN_COLORS[chainId] || '#909098';
  const shortUid = `${attestationUid.slice(0, 10)}...${attestationUid.slice(-6)}`;

  return (
    <div
      className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm ${className}`}
      style={{
        borderColor: `${chainColor}30`,
        background: `${chainColor}08`,
      }}
    >
      {/* Chain indicator dot */}
      <span
        className="inline-block h-2 w-2 rounded-full"
        style={{ backgroundColor: chainColor }}
        title={chainName}
      />

      {/* Attestation UID */}
      <code className="font-mono text-xs text-zinc-300">{shortUid}</code>

      {/* Chain name */}
      <span className="text-xs text-zinc-500">{chainName}</span>

      {/* Verification link */}
      <a
        href={explorerUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="text-xs underline-offset-2 hover:underline"
        style={{ color: chainColor }}
      >
        Verify ↗
      </a>

      {timestamp && (
        <span className="text-xs text-zinc-600">{new Date(timestamp).toLocaleDateString()}</span>
      )}
    </div>
  );
}

/**
 * AttestationBadgeGrid — Display multiple attestations in a grid.
 */
interface AttestationBadgeGridProps {
  attestations: AttestationBadgeProps[];
  className?: string;
}

export function AttestationBadgeGrid({ attestations, className = '' }: AttestationBadgeGridProps) {
  if (attestations.length === 0) {
    return (
      <div className={`text-sm text-zinc-500 ${className}`}>No attestations recorded yet.</div>
    );
  }

  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      {attestations.map((att, i) => (
        <AttestationBadge key={att.attestationUid || i} {...att} />
      ))}
    </div>
  );
}
