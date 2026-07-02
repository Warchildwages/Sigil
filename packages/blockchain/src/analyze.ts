export type RiskLevel = 'low' | 'moderate' | 'high' | 'critical';

export interface AnalysisFinding {
  clause: string;
  concern: string;
  recommendation: string;
  risk: RiskLevel;
}

export interface AnalysisResult {
  overallRisk: RiskLevel;
  findings: AnalysisFinding[];
  recommendation: 'sign' | 'review' | 'reject';
}

export async function analyzeDocument(
  documentText: string,
): Promise<AnalysisResult> {
  // Real implementation:
  // 1. Prompt template with Three NDA Test (🔴🟡🟢)
  // 2. Send to OpenAI/Claude API
  // 3. Parse structured JSON response
  // 4. Return risk assessment with findings

  console.log(
    `[AI Analysis] Analyzing document (${documentText.length} chars)...`,
  );

  throw new Error(
    'AI document analysis not yet implemented. Requires OpenAI or Anthropic SDK + API key.',
  );
}