'use client';

import { useState } from 'react';
import type { AgentAnalysisResponse, AutoDetectedContext, ExtractionResponse, ContractModel } from '@signet/shared';
import { CSRF_HEADER_NAME } from '@signet/shared';

interface AgentAnalysisPanelProps {
  /** If provided, shows the result from a prior API call */
  result?: AgentAnalysisResponse | null;
  /** Called when user wants to run analysis on the given text */
  onAnalyze?: (text: string) => void;
  /** Text to analyze (if running inline) */
  documentText?: string;
  loading?: boolean;
  error?: string | null;
  /** Document ID (required for attestation) */
  documentId?: string;
  /** Attester wallet address */
  attester?: string;
  /** CSRF token for state-changing requests */
  csrfToken?: string;
  /** Called after successful attestation with attestation UID */
  onAttestComplete?: (uid: string) => void;
}

const CONTEXT_LABELS: Record<AutoDetectedContext, string> = {
  'consumer-contract': 'Consumer Contract',
  'business-agreement': 'Business Agreement',
  'notarized-document': 'Notarized Document',
  'general-legal': 'General Legal Document',
};

const RISK_BORDER: Record<string, string> = {
  low: 'border-l-green-500/40',
  moderate: 'border-l-yellow-500/40',
  high: 'border-l-orange-500/40',
  critical: 'border-l-red-500/40',
};

const RISK_BG: Record<string, string> = {
  low: 'bg-green-500/10',
  moderate: 'bg-yellow-500/10',
  high: 'bg-orange-500/10',
  critical: 'bg-red-500/10',
};

export function AgentAnalysisPanel({
  result,
  onAnalyze,
  documentText,
  loading = false,
  error,
  documentId,
  attester,
  csrfToken,
  onAttestComplete,
}: AgentAnalysisPanelProps) {
  const [localText, setLocalText] = useState(documentText ?? '');
  const [extracting, setExtracting] = useState(false);
  const [extractionResult, setExtractionResult] = useState<ExtractionResponse | null>(null);
  const [extractionError, setExtractionError] = useState<string | null>(null);
  const [showContractJson, setShowContractJson] = useState(false);
  const [contractModelEdits, setContractModelEdits] = useState<ContractModel | null>(null);
  const [reviewConfirmed, setReviewConfirmed] = useState(false);
  const [attesting, setAttesting] = useState(false);
  const [attestError, setAttestError] = useState<string | null>(null);
  const [attestUid, setAttestUid] = useState<string | null>(null);

  const handleAttest = async () => {
    if (!documentId || !extractionResult || !attester) return;
    setAttesting(true);
    setAttestError(null);
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (csrfToken) headers[CSRF_HEADER_NAME] = csrfToken;
      const protocolUid = `0x${Date.now().toString(16)}${Math.random().toString(16).slice(2, 10)}`;
      const dataPayload = JSON.stringify(extractionResult.contractModel);
      const res = await fetch('/api/attest', {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify({
          documentId,
          protocol: 'EAS',
          protocolUid,
          schemaUid: '0x0000000000000000000000000000000000000000000000000000000000000000',
          attester,
          recipient: attester,
          data: dataPayload,
          privacyMode: 'public',
          chainId: 84532,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Attestation failed' }));
        throw new Error(err.error || `Attest failed (${res.status})`);
      }
      const resultData = await res.json();
      setAttestUid(resultData.protocolUid || protocolUid);
      setReviewConfirmed(true);
      onAttestComplete?.(resultData.protocolUid || protocolUid);
    } catch (err) {
      setAttestError(err instanceof Error ? err.message : 'Attestation failed');
    } finally {
      setAttesting(false);
    }
  };

  if (!result && !loading && !error && !onAnalyze) {
    return null;
  }

  return (
    <div className="space-y-4">
      {/* Manual analyze input (when no result yet) */}
      {onAnalyze && !result && (
        <div className="space-y-3">
          <textarea
            className="w-full h-32 rounded-lg border border-white/10 bg-white/5 px-4 py-3 font-mono text-xs text-white/70 placeholder-white/20 resize-y focus:outline-none focus:border-white/30"
            placeholder="Paste document text to analyze..."
            value={localText}
            onChange={(e) => setLocalText(e.target.value)}
          />
          <button
            type="button"
            className="rounded-lg bg-amber-500/20 border border-amber-500/30 px-4 py-2 font-mono text-xs text-amber-300 hover:bg-amber-500/30 transition-colors disabled:opacity-40"
            disabled={!localText.trim() || loading}
            onClick={() => onAnalyze(localText)}
          >
            {loading ? 'Analyzing...' : 'Analyze Document'}
          </button>
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-red-500/20 bg-red-500/5 px-4 py-3">
          <p className="font-mono text-xs text-red-400">{error}</p>
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center gap-3 py-6">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-amber-400/60" />
          <span className="font-mono text-sm text-white/60">Analyzing document...</span>
        </div>
      )}

      {result && (
        <div className="space-y-3">
          {/* Header: context badge + metadata */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-0.5 font-mono text-[10px] text-amber-300">
              Detected: {CONTEXT_LABELS[result.autoDetectedContext] ?? result.autoDetectedContext}
            </span>
            {result.modelUsed !== 'none' && (
              <span className="font-mono text-[10px] text-white/20">
                {result.modelUsed} · {result.processingTimeMs}ms
              </span>
            )}
          </div>

          {/* Overall recommendation */}
          <div className={`rounded-lg border px-4 py-3 ${
            result.recommendation === 'sign' ? 'border-green-500/20 bg-green-500/5' :
            result.recommendation === 'review' ? 'border-yellow-500/20 bg-yellow-500/5' :
            'border-red-500/20 bg-red-500/5'
          }`}>
            <p className="font-mono text-xs font-medium text-white/70">
              Recommendation: <span className="text-white/90 uppercase">{result.recommendation}</span>
            </p>
            <p className="font-mono text-[10px] text-white/30 mt-0.5">
              Overall risk: {result.overallRisk} · {result.findings.length} finding{result.findings.length !== 1 ? 's' : ''}
            </p>
          </div>

          {/* Findings list with severity borders */}
          {result.findings.length > 0 && (
            <div className="space-y-2">
              {result.findings.map((f, i) => (
                <div
                  key={i}
                  className={`rounded-lg border border-white/8 border-l-2 ${RISK_BORDER[f.risk] ?? 'border-l-white/20'} ${RISK_BG[f.risk] ?? 'bg-white/[0.02]'} px-3 py-2.5`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-xs font-medium text-white/70">{f.clause}</span>
                    <span className={`rounded px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider ${
                      f.risk === 'critical' ? 'text-red-400 bg-red-500/10' :
                      f.risk === 'high' ? 'text-orange-400 bg-orange-500/10' :
                      f.risk === 'moderate' ? 'text-yellow-400 bg-yellow-500/10' :
                      'text-green-400 bg-green-500/10'
                    }`}>
                      {f.risk}
                    </span>
                  </div>
                  <p className="font-mono text-xs text-white/40 mb-1">{f.concern}</p>
                  <p className="font-mono text-[10px] text-white/25">→ {f.recommendation}</p>
                </div>
              ))}
            </div>
          )}

          {/* Structured Extraction + SVG Visualization */}
          {documentText && (
            <div className="space-y-3 pt-2 border-t border-white/8">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-medium text-white/60">Structure Extraction</span>
                <span className="font-mono text-[10px] text-white/20">AI extracts parties, obligations, conditions</span>
              </div>

              {!extractionResult && !extracting && (
                <button
                  type="button"
                  className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-4 py-2 font-mono text-xs text-emerald-300 hover:bg-emerald-500/10 transition-colors"
                  onClick={async () => {
                    setExtracting(true);
                    setExtractionError(null);
                    try {
                      const res = await fetch('/api/agent/extract', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ documentText, format: 'both' }),
                      });
                      if (!res.ok) throw new Error(`Extraction failed: ${res.status}`);
                      const data = (await res.json()) as ExtractionResponse;
                      setExtractionResult(data);
                      setContractModelEdits(JSON.parse(JSON.stringify(data.contractModel)) as ContractModel);
                    } catch (err) {
                      setExtractionError(err instanceof Error ? err.message : 'Extraction error');
                    } finally {
                      setExtracting(false);
                    }
                  }}
                >
                  Extract Structure
                </button>
              )}

              {extracting && (
                <div className="flex items-center gap-2 py-2">
                  <span className="h-3 w-3 animate-spin rounded-full border-2 border-white/20 border-t-emerald-400/60" />
                  <span className="font-mono text-xs text-white/40">Extracting structure...</span>
                </div>
              )}

              {extractionError && (
                <div className="rounded-lg border border-red-500/20 bg-red-500/5 px-3 py-2">
                  <p className="font-mono text-xs text-red-400">{extractionError}</p>
                </div>
              )}

              {extractionResult && (
                <div className="space-y-3">
                  {/* Metadata bar */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-[10px] text-white/30">
                      {extractionResult.modelUsed !== 'none' ? `${extractionResult.modelUsed} · ${extractionResult.processingTimeMs}ms` : 'rule-based fallback'}
                    </span>
                    <span className="font-mono text-[10px] text-white/20">
                      {extractionResult.contractModel.parties.length} parties · {extractionResult.contractModel.obligations.length} obligations · {extractionResult.contractModel.conditions.length} conditions
                    </span>
                  </div>

                  {/* SVG Diagram */}
                  {extractionResult.svg && (
                    <div className="rounded-lg border border-white/8 bg-[#050508] overflow-x-auto">
                      <div
                        className="min-w-[800px]"
                        dangerouslySetInnerHTML={{ __html: extractionResult.svg }}
                      />
                    </div>
                  )}

                  {/* Professional Review Gate */}
                  <div className={`rounded-lg border px-4 py-3 ${
                    reviewConfirmed
                      ? 'border-emerald-500/20 bg-emerald-500/5'
                      : 'border-amber-500/20 bg-amber-500/5'
                  }`}>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-mono text-xs font-medium text-white/70">
                        {reviewConfirmed ? '✓ Reviewed' : '⚠ Review Required'}
                      </span>
                      <span className="font-mono text-[10px] text-white/30">
                        {reviewConfirmed
                          ? 'Ready to attest on-chain'
                          : 'AI proposes — you review and confirm'}
                      </span>
                    </div>

                    {!reviewConfirmed && (
                      <>
                        <p className="font-mono text-xs text-white/40 mb-2">
                          The AI extracted the contract structure above. Review the parties,
                          obligations, and conditions for accuracy before attesting.
                        </p>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 font-mono text-[10px] text-white/50 hover:bg-white/10 transition-colors"
                            onClick={() => setShowContractJson(!showContractJson)}
                          >
                            {showContractJson ? 'Hide JSON' : 'View JSON'}
                          </button>
                          <button
                            type="button"
                            className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 font-mono text-[10px] text-emerald-300 hover:bg-emerald-500/20 transition-colors disabled:opacity-40"
                            disabled={attesting || !documentId || !attester}
                            onClick={handleAttest}
                          >
                            {attesting ? 'Attesting...' : 'Confirm & Attest'}
                          </button>
                        </div>
                      </>
                    )}

                    {attesting && (
                      <div className="flex items-center gap-2 py-1">
                        <span className="h-3 w-3 animate-spin rounded-full border-2 border-white/20 border-t-emerald-400/60" />
                        <span className="font-mono text-xs text-white/50">Recording attestation...</span>
                      </div>
                    )}

                    {attestError && (
                      <div className="rounded-lg border border-red-500/20 bg-red-500/5 px-3 py-2 mt-2">
                        <p className="font-mono text-xs text-red-400">{attestError}</p>
                      </div>
                    )}

                    {reviewConfirmed && !attesting && !attestError && (
                      <div className="space-y-1">
                        <p className="font-mono text-xs text-emerald-400/70">
                          ✓ Structure verified & attested on-chain.
                        </p>
                        {attestUid && (
                          <p className="font-mono text-[10px] text-white/30 break-all">
                            Attestation UID: <span className="text-emerald-400/50">{attestUid}</span>
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Collapsible structured JSON */}
                  {showContractJson && extractionResult.contractModel && (
                    <div className="rounded-lg border border-white/8 bg-white/[0.02] px-4 py-3 overflow-x-auto">
                      <pre className="font-mono text-[10px] text-white/50 whitespace-pre-wrap break-all">
                        {JSON.stringify(extractionResult.contractModel, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Completeness check */}
          {result.completeness && (
            <div className={`rounded-lg border px-4 py-3 ${result.completeness.isComplete ? 'border-green-500/20 bg-green-500/5' : 'border-yellow-500/20 bg-yellow-500/5'}`}>
              <div className="mb-2 flex items-center gap-2">
                <span className="font-mono text-xs font-medium text-white/80">Document Completeness</span>
                <span className={`rounded-full border px-2 py-0.5 font-mono text-[10px] ${result.completeness.isComplete ? 'text-green-400 border-green-500/30 bg-green-500/10' : 'text-yellow-400 border-yellow-500/30 bg-yellow-500/10'}`}>
                  {result.completeness.isComplete ? 'Complete' : `${result.completeness.missingElements.length} issues`}
                </span>
              </div>
              {result.completeness.warnings.map((w, i) => (
                <p key={i} className="font-mono text-xs text-white/40">⚠ {w}</p>
              ))}
              <div className="mt-2 grid grid-cols-2 gap-1 font-mono text-[10px] text-white/30">
                <span>{result.completeness.requiredElements.signatures ? '✓' : '✗'} Signature block</span>
                <span>{result.completeness.requiredElements.dates ? '✓' : '✗'} Date field</span>
                <span>{result.completeness.requiredElements.parties ? '✓' : '✗'} Parties identified</span>
                <span>{result.completeness.requiredElements.terms ? '✓' : '✗'} Substantive terms</span>
                <span>{result.completeness.requiredElements.governingLaw ? '✓' : '✗'} Governing law</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}