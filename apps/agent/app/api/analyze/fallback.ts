import type { AnalyzeResult } from '@sigil/shared';

/**
 * Fallback analysis stub — returned when no LLM API key is available.
 * Real AI-powered clause-by-clause document analysis is coming soon.
 * The completeness checker (which does real structural validation) still runs independently.
 *
 * Returns an empty findings array with a low risk and sign recommendation.
 * The frontend AIAnalysisPanel detects the empty findings and displays
 * a "coming soon" message instead of showing a risk assessment.
 */
export function getFallbackAnalysis(_contentHash: string): AnalyzeResult {
  return {
    overallRisk: 'low',
    findings: [],
    recommendation: 'sign',
  };
}