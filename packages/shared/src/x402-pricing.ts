// Centralized x402 nanopayment pricing constants for Sigil
//
// Single source of truth for all 10 x402 operations.
// Used by service-info route, agent-identity capability builder,
// payment verification, and Circle Marketplace listing.
//
// All prices in USDC (6 decimals). These are production prices.
// Update this file to change pricing across the entire codebase.

/** Price per operation in USDC */
export const X402_PRICING: Record<string, number> = {
  analyze: 0.01,
  knowledge: 0.005,
  witness: 0.02,
  timestamp: 0.005,
  compliance: 0.05,
  reputation: 0.03,
  oracle: 0.05,
  milestone: 0.01,
  translate: 0.03,
};

/** Operation display names for UI and capability descriptions */
export const X402_OPERATION_NAMES: Record<string, string> = {
  analyze: 'Document Analysis',
  knowledge: 'Legal Knowledge Q&A',
  witness: 'Agreement Witnessing',
  timestamp: 'Proof of Existence',
  compliance: 'Compliance Audit',
  reputation: 'Agent Reputation',
  oracle: 'Legal Event Oracle',
  milestone: 'Milestone Verification',
  translate: 'Translation Fidelity',
};

/** Operation descriptions for marketplace listings and service-info */
export const X402_OPERATION_DESCRIPTIONS: Record<string, string> = {
  analyze:
    'Full document analysis: risk scoring, plain-English clause translations, industry benchmarks, completeness check, and AI recommendations.',
  knowledge:
    'Legal knowledge Q&A: directional guidance on legal structures, compliance, contracts, and regulatory considerations. Not legal advice.',
  witness:
    'Agent-to-agent agreement witnessing: neutral third-party attestation of escrow deposits, deliverable verification, and binding dispute resolution with immutable Arc memo journal entries.',
  timestamp:
    'Proof of existence: attest that a document, codebase, or evidence existed at a specific time. Immutable EAS attestation + Arc memo.',
  compliance:
    'Regulatory compliance audit: verify an agent or process meets a compliance standard (e.g., ABA-AI-2025, GDPR Art.22). Attestation of findings.',
  reputation:
    'Agent reputation score attestation: completed agreements, dispute rate, average resolution time, reputation tier. Attested on EAS — cannot be forged.',
  oracle:
    'Legal event oracle: research a question via web + deterministic sources, attest the answer on-chain for smart contract consumption.',
  milestone:
    'Standalone deliverable verification (lighter than full escrow). Verify a milestone against acceptance criteria, attest completion.',
  translate:
    'Translation fidelity attestation: verify a translation is faithful to the source document. Attest accuracy or specific discrepancies.',
};

/** All valid operation IDs */
export const VALID_OPERATIONS: string[] = Object.keys(X402_PRICING);

/**
 * Get the price in USDC for a given operation.
 * Returns 0 if the operation is not recognized (caller should validate).
 */
export function getOperationPrice(operation: string): number {
  const key = operation as keyof typeof X402_PRICING;
  return X402_PRICING[key] ?? 0;
}

/**
 * Get all operation prices as a plain record.
 * Used by service-info route and agent status endpoint.
 */
export function getAllOperationPrices(): Record<string, number> {
  return { ...X402_PRICING };
}

/**
 * Get all operation names.
 */
export function getAllOperationNames(): Record<string, string> {
  return { ...X402_OPERATION_NAMES };
}

/**
 * Get all operation descriptions.
 */
export function getAllOperationDescriptions(): Record<string, string> {
  return { ...X402_OPERATION_DESCRIPTIONS };
}

/**
 * Get the single "headline" price for the service listing.
 * Uses the analyze price as the representative price.
 */
export function getHeadlinePrice(): number {
  return X402_PRICING.analyze as number;
}
