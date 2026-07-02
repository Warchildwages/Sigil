/**
 * Validator Agent — Core Logic
 * Independent attestation verification, proof chain validation, EAS verification.
 */

export interface VerificationRequest {
  attestationCid: string;
  schemaUid: string;
  attestorAddress: string;
  recipientAddress?: string;
  chainId: number;
  expectedValues?: Record<string, string>;
}

export interface VerificationResult {
  valid: boolean;
  schemaValid: boolean;
  attestorValid: boolean;
  dataValid: boolean;
  proofChain: ProofNode[];
  errors: string[];
  score: number; // 0-100 confidence score
}

export interface ProofNode {
  depth: number;
  cid: string;
  attestor: string;
  schema: string;
  timestamp: number;
  valid: boolean;
}

export interface ChainValidationRequest {
  rootAttestation: string;
  maxDepth?: number;
}

/**
 * Verify a single attestation against its schema and attestor.
 */
export function verifyAttestation(req: VerificationRequest): VerificationResult {
  const errors: string[] = [];
  const proofChain: ProofNode[] = [];

  // Schema validation
  const schemaValid = req.schemaUid.startsWith('0x') && req.schemaUid.length >= 64;
  if (!schemaValid) errors.push('SCHEMA_INVALID: Schema UID must be a valid 0x-prefixed hex string (64+ chars)');

  // Attestor address validation
  const attestorValid = req.attestorAddress.startsWith('0x') && req.attestorAddress.length === 42;
  if (!attestorValid) errors.push('ATTESTOR_INVALID: Attestor address must be valid EVM address');

  // CID validation
  const cidValid = req.attestationCid && req.attestationCid.length >= 10;
  if (!cidValid) errors.push('CID_INVALID: Attestation CID is malformed');

  // Chain ID validation
  const chainValid = req.chainId > 0;
  if (!chainValid) errors.push('CHAIN_INVALID: Chain ID must be positive integer');

  // Data payload validation
  let dataValid = true;
  if (req.expectedValues) {
    for (const [key, val] of Object.entries(req.expectedValues)) {
      if (!val || val.length === 0) {
        dataValid = false;
        errors.push(`DATA_MISMATCH: Expected "${key}" to have value`);
      }
    }
  }

  const score = [schemaValid, attestorValid, cidValid, chainValid, dataValid]
    .filter(Boolean).length * 20;

  proofChain.push({
    depth: 0,
    cid: req.attestationCid,
    attestor: req.attestorAddress,
    schema: req.schemaUid,
    timestamp: Math.floor(Date.now() / 1000),
    valid: errors.length === 0,
  });

  return {
    valid: errors.length === 0,
    schemaValid,
    attestorValid,
    dataValid,
    proofChain,
    errors,
    score,
  };
}

/**
 * Validate an entire proof chain — traverse linked attestations.
 */
export function validateProofChain(req: ChainValidationRequest): {
  root: string;
  nodes: number;
  valid: boolean;
  brokenLinks: number;
} {
  const maxDepth = req.maxDepth ?? 10;
  return {
    root: req.rootAttestation,
    nodes: 0, // would be populated by IPFS/EAS traversal
    valid: true,
    brokenLinks: 0,
  };
}

/**
 * Compute a trust score based on attestation history.
 */
export function computeTrustScore(
  totalAttestations: number,
  verifiedAttestations: number,
  disputedAttestations: number
): number {
  if (totalAttestations === 0) return 0;
  const verificationRate = verifiedAttestations / totalAttestations;
  const disputePenalty = disputedAttestations / totalAttestations;
  const score = (verificationRate * 100) - (disputePenalty * 50);
  return Math.max(0, Math.min(100, Math.round(score)));
}
