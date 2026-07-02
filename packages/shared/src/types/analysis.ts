export type RiskLevel = 'low' | 'moderate' | 'high' | 'critical';

export interface ClauseFinding {
  clause: string;
  concern: string;
  recommendation: string;
  risk: RiskLevel;
}

export interface AnalyzeResult {
  overallRisk: RiskLevel;
  findings: ClauseFinding[];
  recommendation: 'sign' | 'review' | 'reject';
}

export interface DocumentCompleteness {
  isComplete: boolean;
  missingElements: string[];
  requiredElements: {
    /** Has at least one signature block */
    signatures: boolean;
    /** Has at least one date field */
    dates: boolean;
    /** Identifies all parties */
    parties: boolean;
    /** Has substantive terms/clauses */
    terms: boolean;
    /** Specifies governing law/jurisdiction */
    governingLaw: boolean;
  };
  warnings: string[];
}

// ── Risk Assessment (Phase 2.5 — /review consumer analysis) ──

export type RiskAssessmentLevel = 'high' | 'moderate' | 'low';

export interface RiskIssue {
  severity: 'critical' | 'warning' | 'info';
  category: 'term' | 'obligation' | 'scope' | 'completeness' | 'jurisdiction' | 'penalty' | 'definition';
  /** The original clause text from the document */
  clause: string;
  /** Plain-English translation of what this clause means */
  plainEnglish: string;
  /** Why this is a problem for the user */
  explanation: string;
  /** Specific recommended action */
  recommendation: string;
}

export interface BenchmarkComparison {
  /** What's being compared (e.g., "NDA Term Length") */
  label: string;
  /** Industry standard value */
  standard: string;
  /** This document's value */
  yours: string;
  /** How this document compares */
  assessment: 'above' | 'at' | 'below';
}

export interface RiskAssessment {
  /** Overall risk level */
  riskLevel: RiskAssessmentLevel;
  /** Numeric score 0-100 (0 = worst, 100 = best) */
  score: number;
  /** Detected document type */
  documentType: string;
  /** One-paragraph plain-English summary of what this document does */
  summary: string;
  /** Flagged issues with plain-English translations */
  issues: RiskIssue[];
  /** Industry benchmark comparisons */
  benchmarks?: BenchmarkComparison[];
}

export interface EditRequest {
  /** Description of what to change in plain English */
  instruction: string;
  /** The clause or section to modify (AI resolves from instruction if omitted) */
  targetClause?: string;
  /** Index of the risk issue being addressed (linked to RiskIssue) */
  addressingIssueIndex?: number;
}

export interface EditResult {
  /** The modified clause text */
  newClause: string;
  /** Explanation of what changed */
  explanation: string;
  /** Whether the edit resolves the original risk issue */
  resolvesIssue: boolean;
}