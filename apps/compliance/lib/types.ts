/**
 * Compliance Agent — Types
 */

export interface ScreenRequest {
  entityId: string;
  jurisdiction: string;
  entityType: 'individual' | 'organization';
  assetClass?: string;
  amount?: string;
}

export interface ScreenResponse {
  sessionId: string;
  passed: boolean;
  risk: 'low' | 'medium' | 'high' | 'critical';
  flags: string[];
  requiredVerifications: string[];
  evidence: { rule: string; detail: string }[];
  attestationCid?: string;
}

export interface ReportRequest {
  sessionId: string;
  includeEvidence?: boolean;
}

export interface ReportResponse {
  sessionId: string;
  summary: string;
  risk: string;
  steps: { name: string; status: 'passed' | 'failed' | 'pending'; detail?: string }[];
  attestations: { schema: string; cid: string; chain: string }[];
  generatedAt: string;
}
