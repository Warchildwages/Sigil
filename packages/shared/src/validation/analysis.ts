import { z } from 'zod';

export const riskLevelSchema = z.enum(['low', 'moderate', 'high', 'critical']);

export const clauseFindingSchema = z.object({
  clause: z.string().min(1),
  concern: z.string(),
  recommendation: z.string(),
  risk: riskLevelSchema,
});

export const analyzeResultSchema = z.object({
  overallRisk: riskLevelSchema,
  findings: z.array(clauseFindingSchema),
  recommendation: z.enum(['sign', 'review', 'reject']),
});

export const requiredElementsSchema = z.object({
  signatures: z.boolean(),
  dates: z.boolean(),
  parties: z.boolean(),
  terms: z.boolean(),
  governingLaw: z.boolean(),
});

export const documentCompletenessSchema = z.object({
  isComplete: z.boolean(),
  missingElements: z.array(z.string()),
  requiredElements: requiredElementsSchema,
  warnings: z.array(z.string()),
});

// ── Risk Assessment schemas (Phase 2.5 — /review consumer analysis) ──

export const riskIssueSchema = z.object({
  severity: z.enum(['critical', 'warning', 'info']),
  category: z.enum(['term', 'obligation', 'scope', 'completeness', 'jurisdiction', 'penalty', 'definition']),
  clause: z.string().min(1),
  plainEnglish: z.string(),
  explanation: z.string(),
  recommendation: z.string(),
});

export const benchmarkComparisonSchema = z.object({
  label: z.string().min(1),
  standard: z.string(),
  yours: z.string(),
  assessment: z.enum(['above', 'at', 'below']),
});

export const riskAssessmentSchema = z.object({
  riskLevel: z.enum(['high', 'moderate', 'low']),
  score: z.number().int().min(0).max(100),
  documentType: z.string().min(1),
  summary: z.string().min(1),
  issues: z.array(riskIssueSchema),
  benchmarks: z.array(benchmarkComparisonSchema).optional(),
});

export const editRequestSchema = z.object({
  instruction: z.string().min(1, 'Instruction is required'),
  targetClause: z.string().optional(),
  addressingIssueIndex: z.number().int().min(0).optional(),
});

export const editResultSchema = z.object({
  newClause: z.string(),
  explanation: z.string(),
  resolvesIssue: z.boolean(),
});
