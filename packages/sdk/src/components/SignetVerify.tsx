interface SignetVerifyProps {
  attestationUid: string;
  documentHash: `0x${string}` | null;
  isMock: boolean;
}

export function SignetVerify({ attestationUid, documentHash, isMock }: SignetVerifyProps) {
  const explorerUrl = isMock
    ? null
    : `https://base-sepolia.easscan.org/attestation/view/${attestationUid}`;

  return (
    <div className="signet-verify">
      <div className="signet-card signet-verify-card">
        <div className="signet-verify-status">
          <span className={`signet-verify-badge ${isMock ? 'signet-verify-badge--mock' : 'signet-verify-badge--real'}`}>
            {isMock ? 'Demo Mode' : '✓ On-Chain'}
          </span>
        </div>

        <h3 className="signet-card-title">Attestation Complete</h3>

        <div className="signet-verify-details">
          <div className="signet-verify-field">
            <span className="signet-verify-label">Attestation UID</span>
            <span className="signet-verify-value signet-mono">{attestationUid}</span>
          </div>
          {documentHash && (
            <div className="signet-verify-field">
              <span className="signet-verify-label">Document Hash</span>
              <span className="signet-verify-value signet-mono">
                {documentHash.slice(0, 20)}...{documentHash.slice(-8)}
              </span>
            </div>
          )}
        </div>

        {isMock ? (
          <div className="signet-verify-mock-notice">
            This is a demo attestation. Configure Circle credentials for real on-chain attestation on Base Sepolia.
          </div>
        ) : explorerUrl ? (
          <a
            href={explorerUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="signet-btn signet-btn--secondary signet-verify-link"
          >
            View on EASscan ↗
          </a>
        ) : null}
      </div>
    </div>
  );
}