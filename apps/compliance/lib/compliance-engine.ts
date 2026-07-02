/**
 * Compliance Agent — Core Logic
 * Jurisdiction checking, AML/KYC screening, sanctions watchlists.
 */

export interface ComplianceCheck {
  entityId: string;
  jurisdiction: string;
  entityType: 'individual' | 'organization';
  assetClass?: string;
  amount?: string;
}

export interface ComplianceResult {
  passed: boolean;
  jurisdiction: string;
  risk: 'low' | 'medium' | 'high' | 'critical';
  flags: string[];
  requiredVerifications: string[];
  evidence: { rule: string; detail: string }[];
}

// Jurisdiction risk tiers
const JURISDICTION_TIERS: Record<string, 'low' | 'medium' | 'high' | 'critical'> = {
  US: 'medium',
  UK: 'low',
  EU: 'low',
  SG: 'low',
  JP: 'low',
  CH: 'low',
  AE: 'medium',
  KR: 'medium',
  RU: 'critical',
  CN: 'high',
  IR: 'critical',
  KP: 'critical',
  SY: 'critical',
  CU: 'critical',
  VE: 'high',
};

export function assessJurisdictionRisk(jurisdiction: string): {
  tier: 'low' | 'medium' | 'high' | 'critical';
  flags: string[];
} {
  const tier = JURISDICTION_TIERS[jurisdiction.toUpperCase()] ?? 'high';
  const flags: string[] = [];
  
  if (tier === 'critical') {
    flags.push('SANCTIONS_BLOCKED: Jurisdiction under international sanctions');
  }
  if (tier === 'high') {
    flags.push('ENHANCED_DUE_DILIGENCE: High-risk jurisdiction requires EDD');
  }
  if (tier === 'medium') {
    flags.push('STANDARD_DUE_DILIGENCE: Medium-risk jurisdiction requires SDD');
  }
  
  return { tier, flags };
}

export function estimateAMLDepth(amount: string, entityType: string): number {
  const num = parseFloat(amount);
  if (Number.isNaN(num)) return 1;
  if (num > 1_000_000) return 5;  // Enhanced — beneficial ownership, source of funds
  if (num > 100_000) return 3;     // Standard — ID verification, PEP check
  if (num > 10_000) return 2;      // Simplified — ID verification
  return 1;                         // Minimal — no checks
}

export function requiredVerifications(jurisdiction: string, amount: string, entityType: string): string[] {
  const reqs: string[] = [];
  const depth = estimateAMLDepth(amount, entityType);
  const { tier } = assessJurisdictionRisk(jurisdiction);

  reqs.push('IDENTITY_VERIFICATION');
  if (depth >= 2) reqs.push('SANCTIONS_SCREEN');
  if (depth >= 3) reqs.push('PEP_SCREEN');
  if (tier === 'high' || depth >= 4) reqs.push('SOURCE_OF_FUNDS');
  if (tier === 'critical') reqs.push('REGULATORY_OVERRIDE');
  if (depth >= 5) reqs.push('BENEFICIAL_OWNERSHIP');

  return reqs;
}

export function runComplianceCheck(check: ComplianceCheck): ComplianceResult {
  const { tier, flags } = assessJurisdictionRisk(check.jurisdiction);
  const reqs = requiredVerifications(check.jurisdiction, check.amount ?? '0', check.entityType);
  const evidence: { rule: string; detail: string }[] = [];

  evidence.push({
    rule: 'JURISDICTION_RISK',
    detail: `${check.jurisdiction} classified as ${tier} risk`,
  });

  if (check.assetClass) {
    evidence.push({
      rule: 'ASSET_CLASS',
      detail: `Asset class: ${check.assetClass}`,
    });
  }

  const passed = tier !== 'critical';

  return {
    passed,
    jurisdiction: check.jurisdiction,
    risk: tier,
    flags: [...flags],
    requiredVerifications: reqs,
    evidence,
  };
}

export function verifyAttestation(
  proofCid: string,
  schema: string,
  attestorAddress: string
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!proofCid || proofCid.length < 10) {
    errors.push('INVALID_CID: Proof CID is malformed or too short');
  }
  if (!schema.startsWith('0x')) {
    errors.push('INVALID_SCHEMA: Schema UID must be hex-encoded');
  }
  if (!attestorAddress.startsWith('0x') || attestorAddress.length !== 42) {
    errors.push('INVALID_ATTESTOR: Address must be a valid 0x-prefixed EVM address');
  }

  return { valid: errors.length === 0, errors };
}
