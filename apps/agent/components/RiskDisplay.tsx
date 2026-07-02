'use client';

import type { RiskAssessment, BenchmarkComparison } from '@sigil/shared';
import { useState } from 'react';

interface RiskDisplayProps {
  risk: RiskAssessment;
  onEditRequest?: (issueIndex: number, instruction: string) => void;
  editResult?: { newClause: string; explanation: string } | null;
  editing: boolean;
}

const riskColors: Record<string, { bg: string; text: string; border: string; badge: string }> = {
  high: {
    bg: 'bg-red-500/5',
    text: 'text-red-400',
    border: 'border-red-500/20',
    badge: 'bg-red-500/20 text-red-300',
  },
  moderate: {
    bg: 'bg-amber-500/5',
    text: 'text-amber-400',
    border: 'border-amber-500/20',
    badge: 'bg-amber-500/20 text-amber-300',
  },
  low: {
    bg: 'bg-emerald-500/5',
    text: 'text-emerald-400',
    border: 'border-emerald-500/20',
    badge: 'bg-emerald-500/20 text-emerald-300',
  },
};

const riskEmoji: Record<string, string> = { high: '🔴', moderate: '🟡', low: '🟢' };
const severityLabels: Record<string, string> = { critical: 'Critical', warning: 'Warning', info: 'Info' };

function BenchmarkRow({ b }: { b: BenchmarkComparison }) {
  const assessmentColor =
    b.assessment === 'below' ? 'text-red-400' : b.assessment === 'at' ? 'text-amber-400' : 'text-emerald-400';
  return (
    <div className="flex items-center justify-between gap-4 py-1.5 border-b border-white/5 last:border-0">
      <span className="font-mono text-xs text-white/50">{b.label}</span>
      <div className="flex items-center gap-3">
        <span className="font-mono text-xs text-white/30">Standard: {b.standard}</span>
        <span className={`font-mono text-xs ${assessmentColor}`}>Yours: {b.yours}</span>
      </div>
    </div>
  );
}

export function RiskDisplay({ risk, onEditRequest, editResult, editing }: RiskDisplayProps) {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editInstruction, setEditInstruction] = useState('');
  const colors = riskColors[risk.riskLevel] ?? riskColors.moderate!;

  const handleEditSubmit = (index: number) => {
    if (editInstruction.trim() && onEditRequest) {
      onEditRequest(index, editInstruction.trim());
      setEditInstruction('');
      setEditingIndex(null);
    }
  };

  return (
    <div className="signet-card space-y-6">
      {/* Risk Score Banner */}
      <div className={`rounded-xl ${colors.bg} ${colors.border} border px-5 py-4`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{riskEmoji[risk.riskLevel] ?? '⚪'}</span>
            <div>
              <span className={`font-mono text-sm tracking-wider uppercase ${colors.text}`}>
                {risk.riskLevel === 'high' ? 'High Risk' : risk.riskLevel === 'moderate' ? 'Moderate Risk' : 'Low Risk'}
              </span>
              <span className="ml-2 font-mono text-xs text-white/30">— Score: {risk.score}/100</span>
            </div>
          </div>
          <span className={`rounded-full px-3 py-1 font-mono text-xs ${colors.badge}`}>
            {risk.documentType}
          </span>
        </div>

        {/* Plain-English Summary */}
        {risk.summary && (
          <p className="mt-3 font-sans text-sm leading-relaxed text-white/60">{risk.summary}</p>
        )}
      </div>

      {/* Issues List */}
      {risk.issues.length > 0 && (
        <div className="space-y-4">
          <h3 className="font-mono text-xs tracking-wider text-white/30 uppercase">Issues Found</h3>
          {risk.issues.map((issue, i) => (
            <div key={i} className={`rounded-lg border ${colors.border} ${colors.bg} px-4 py-3 space-y-2`}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className={`rounded px-2 py-0.5 font-mono text-[10px] uppercase ${
                    issue.severity === 'critical' ? 'bg-red-500/20 text-red-300' :
                    issue.severity === 'warning' ? 'bg-amber-500/20 text-amber-300' :
                    'bg-blue-500/20 text-blue-300'
                  }`}>
                    {severityLabels[issue.severity] ?? issue.severity}
                  </span>
                  <span className="font-mono text-[10px] text-white/20 uppercase">{issue.category}</span>
                </div>
                {onEditRequest && (
                  <button
                    onClick={() => setEditingIndex(editingIndex === i ? null : i)}
                    className="font-mono text-xs text-amber-400/60 hover:text-amber-400 transition shrink-0"
                  >
                    {editingIndex === i ? 'Cancel' : 'Edit this'}
                  </button>
                )}
              </div>

              {/* Original clause */}
              <div className="rounded bg-white/[0.03] border border-white/5 px-3 py-2">
                <p className="font-mono text-xs text-white/40 leading-relaxed">"{issue.clause}"</p>
              </div>

              {/* Plain English translation */}
              <div>
                <span className="font-mono text-[10px] text-white/20 uppercase mr-2">🔍 What this means:</span>
                <p className="font-sans text-sm text-white/60 leading-relaxed">{issue.plainEnglish}</p>
              </div>

              {/* Explanation + Recommendation */}
              <p className="font-sans text-xs text-white/40">{issue.explanation}</p>
              <p className="font-sans text-xs font-medium text-amber-400/80">✅ {issue.recommendation}</p>

              {/* Edit UI */}
              {editingIndex === i && (
                <div className="mt-3 space-y-2 border-t border-white/5 pt-3">
                  <p className="font-mono text-xs text-white/30">
                    Describe what you want changed in plain English:
                  </p>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={editInstruction}
                      onChange={(e) => setEditInstruction(e.target.value)}
                      placeholder="e.g., Change the term to 2 years"
                      className="flex-1 rounded-lg bg-white/5 border border-white/10 px-3 py-2 font-mono text-xs text-white/60 placeholder:text-white/20 focus:outline-none focus:border-amber-500/30"
                      onKeyDown={(e) => e.key === 'Enter' && handleEditSubmit(i)}
                    />
                    <button
                      onClick={() => handleEditSubmit(i)}
                      disabled={!editInstruction.trim() || editing}
                      className="rounded-lg bg-amber-500/20 border border-amber-500/30 px-4 py-2 font-mono text-xs text-amber-300 hover:bg-amber-500/30 disabled:opacity-30 transition"
                    >
                      {editing ? '...' : 'Apply'}
                    </button>
                  </div>
                  {editResult && (
                    <div className="rounded-lg bg-emerald-500/5 border border-emerald-500/20 px-3 py-2 mt-2">
                      <p className="font-mono text-xs text-emerald-400/80">{editResult.explanation}</p>
                      <p className="font-mono text-xs text-white/50 mt-1">"{editResult.newClause}"</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Benchmarks */}
      {risk.benchmarks && risk.benchmarks.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-mono text-xs tracking-wider text-white/30 uppercase">How You Compare</h3>
          <div className="rounded-lg border border-white/10 bg-white/[0.02] px-4 py-3">
            {risk.benchmarks.map((b, i) => (
              <BenchmarkRow key={i} b={b} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}