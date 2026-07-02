'use client';

import { useState, useEffect } from 'react';
import type { DocumentCompleteness } from '@signet/shared';

interface AIAnalysisPanelProps {
  documentHash: `0x${string}` | null;
  fileName: string | null;
  file?: File | null;
}

export function AIAnalysisPanel({ documentHash, fileName, file }: AIAnalysisPanelProps) {
  const [checking, setChecking] = useState(false);
  const [completeness, setCompleteness] = useState<DocumentCompleteness | null>(null);
  const [completenessError, setCompletenessError] = useState<string | null>(null);

  // Auto-run completeness check when we have a file
  useEffect(() => {
    if (!documentHash || !file) return;

    const runCompleteness = async () => {
      setChecking(true);
      setCompletenessError(null);
      setCompleteness(null);

      try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('contentHash', documentHash);
        formData.append('fileName', fileName ?? 'document');
        formData.append('mimeType', file.type || 'application/pdf');

        const res = await fetch('/api/analyze', {
          method: 'POST',
          body: formData,
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({ error: 'Completeness check failed' }));
          throw new Error(err.error || `Check failed (${res.status})`);
        }

        const data = await res.json();
        if (data.completeness) {
          setCompleteness(data.completeness);
        }
      } catch (err) {
        setCompletenessError(err instanceof Error ? err.message : 'Check failed');
      } finally {
        setChecking(false);
      }
    };

    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    runCompleteness();
  }, [documentHash, file, fileName]);

  if (!documentHash) {
    return null;
  }

  return (
    <div className="signet-card space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-mono text-sm text-white/40 uppercase tracking-wider">
          Document Review
        </h3>
        <span className="font-mono text-xs text-white/20">
          {file ? 'Structural Check' : 'Hash Received'}
        </span>
      </div>

      {/* Completeness Check — auto-runs on upload */}
      {checking && (
        <div className="flex items-center justify-center gap-3 py-4">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-white/60" />
          <span className="font-mono text-sm text-white/60">
            Checking document structure...
          </span>
        </div>
      )}

      {completenessError && (
        <div className="rounded-lg border border-red-500/20 bg-red-500/5 px-4 py-3">
          <p className="font-mono text-xs text-red-400">{completenessError}</p>
        </div>
      )}

      {completeness && (
        <div className={`rounded-lg border px-4 py-3 ${completeness.isComplete ? 'border-green-500/20 bg-green-500/5' : 'border-yellow-500/20 bg-yellow-500/5'}`}>
          <div className="mb-2 flex items-center gap-2">
            <span className="font-mono text-xs font-medium text-white/80">Document Completeness</span>
            <span className={`rounded-full border px-2 py-0.5 font-mono text-[10px] ${completeness.isComplete ? 'text-green-400 border-green-500/30 bg-green-500/10' : 'text-yellow-400 border-yellow-500/30 bg-yellow-500/10'}`}>
              {completeness.isComplete ? 'Complete' : `${completeness.missingElements.length} issues`}
            </span>
          </div>
          {completeness.warnings.map((warning, i) => (
            <p key={i} className="font-mono text-xs text-white/40">⚠ {warning}</p>
          ))}
          <div className="mt-2 grid grid-cols-2 gap-1 font-mono text-[10px] text-white/30">
            <span>{completeness.requiredElements.signatures ? '✓' : '✗'} Signature block</span>
            <span>{completeness.requiredElements.dates ? '✓' : '✗'} Date field</span>
            <span>{completeness.requiredElements.parties ? '✓' : '✗'} Parties identified</span>
            <span>{completeness.requiredElements.terms ? '✓' : '✗'} Substantive terms</span>
            <span>{completeness.requiredElements.governingLaw ? '✓' : '✗'} Governing law</span>
          </div>
        </div>
      )}

      {/* AI Analysis — live when agent data is available */}
      <div className="rounded-lg border border-white/8 bg-white/[0.02] px-4 py-4">
        <div className="mb-2 flex items-center gap-2">
          <span className="font-mono text-xs font-medium text-white/60">🤖 AI Clause Analysis</span>
          <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-0.5 font-mono text-[10px] text-amber-300">
            Agent Ready
          </span>
        </div>
        <p className="font-mono text-xs text-white/30 leading-relaxed">
          The legal agent auto-detects document context and analyzes clauses across
          consumer-protection, contract-risk, and notary-compliance categories —
          flagging risks with severity indicators before you sign.
        </p>
        <p className="mt-2 font-mono text-[10px] text-white/15">
          Available via <span className="text-white/30">POST /api/agent/analyze</span>
        </p>
      </div>
    </div>
  );
}