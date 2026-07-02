interface SignetAnalyzeProps {
  fileName: string | null;
  hash: string | null;
  analysisResult: Record<string, unknown> | null;
  onContinue: () => void;
}

export function SignetAnalyze({ fileName, hash, analysisResult, onContinue }: SignetAnalyzeProps) {
  return (
    <div className="signet-analyze">
      <div className="signet-card">
        <h3 className="signet-card-title">Document Analysis</h3>
        <div className="signet-analyze-meta">
          <div className="signet-analyze-field">
            <span className="signet-analyze-label">File</span>
            <span className="signet-analyze-value">{fileName ?? 'Unknown'}</span>
          </div>
          <div className="signet-analyze-field">
            <span className="signet-analyze-label">Hash</span>
            <span className="signet-analyze-value signet-mono">
              {hash ? `${hash.slice(0, 16)}...${hash.slice(-8)}` : '—'}
            </span>
          </div>
        </div>

        {analysisResult ? (
          <div className="signet-analyze-result">
            {/* Completeness */}
            {typeof analysisResult.completeness === 'object' && analysisResult.completeness ? (
              <div className="signet-analyze-section">
                <p className="signet-analyze-section-title">Completeness Check</p>
                <pre className="signet-analyze-json">
                  {JSON.stringify(analysisResult.completeness, null, 2)}
                </pre>
              </div>
            ) : null}

            {/* Findings */}
            {Array.isArray(analysisResult.findings) && analysisResult.findings.length > 0 ? (
              <div className="signet-analyze-section">
                <p className="signet-analyze-section-title">Findings</p>
                <ul className="signet-analyze-list">
                  {(analysisResult.findings as Array<{ message: string; severity?: string }>).map(
                    (f, i) => (
                      // biome-ignore lint/suspicious/noArrayIndexKey: static list
                      <li key={i} className={`signet-analyze-finding signet-analyze-finding--${f.severity ?? 'info'}`}>
                        {f.message}
                      </li>
                    ),
                  )}
                </ul>
              </div>
            ) : null}

            {/* Recommendation */}
            {typeof analysisResult.recommendation === 'string' && (
              <div className="signet-analyze-section">
                <p className="signet-analyze-section-title">Recommendation</p>
                <p className="signet-analyze-text">{analysisResult.recommendation}</p>
              </div>
            )}
          </div>
        ) : (
          <div className="signet-analyze-loading">
            <div className="signet-spinner" />
            <p className="signet-analyze-text">Analyzing document...</p>
          </div>
        )}
      </div>

      <div className="signet-analyze-continue">
        <button
          onClick={onContinue}
          type="button"
          className="signet-btn signet-btn--primary"
        >
          Continue to Sign
        </button>
      </div>
    </div>
  );
}