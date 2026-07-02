/** What the agent auto-detected about the document */
export type AutoDetectedContext =
  | 'consumer-contract'
  | 'business-agreement'
  | 'notarized-document'
  | 'general-legal';

export interface AgentContextHint {
  entityType?: 'individual' | 'business' | 'notary' | 'government';
  jurisdiction?: string; // e.g. "US-DE", "US-CA", "EU-GDPR"
  counterpartyName?: string;
}

export interface AgentAnalysisRequest {
  documentText: string;
  /** Optional hints that help the agent narrow its focus, but the agent
   *  auto-detects the primary context from the document text itself.
   *  Not a user-facing selection — passed by the system or SDK consumer. */
  contextHint?: AgentContextHint;
}

export interface AgentAnalysisResponse {
  analysisId: string;
  autoDetectedContext: AutoDetectedContext;
  overallRisk: 'low' | 'moderate' | 'high' | 'critical';
  findings: import('./analysis.js').ClauseFinding[];
  recommendation: 'sign' | 'review' | 'reject';
  completeness: import('./analysis.js').DocumentCompleteness | null;
  /** Consumer-facing risk assessment with benchmarks and plain-English (Phase 2.5 — /review) */
  risk?: import('./analysis.js').RiskAssessment;
  /** Complexity scoring from @signet/agent-core */
  complexity?: { score: number; label: string };
  /** Detected personas/emphasis vectors from @signet/agent-core */
  personas?: string[];
  generatedAt: string; // ISO 8601
  modelUsed: string; // e.g. "groq/llama-3.2-3b", "openai/gpt-4o-mini"
  processingTimeMs: number;
}

/** Structured contract model extracted from a legal document by the LLM.
 *  This is the machine-readable truth — the SVG is the visual rendering. */
export interface ContractParty {
  id: string; // e.g. "p1"
  name: string; // e.g. "Alice Smith (Testator)"
  role:
    | 'signer'
    | 'counterparty'
    | 'beneficiary'
    | 'witness'
    | 'trustee'
    | 'executor'
    | 'agent'
    | 'lender'
    | 'borrower';
  walletAddress?: string | null;
}

export interface ContractObligation {
  from: string; // party id
  to: string; // party id
  description: string; // e.g. "60% of estate to Emma"
  type: 'payment' | 'delivery' | 'service' | 'restriction' | 'disclosure';
}

export interface ContractCondition {
  description: string; // e.g. "IF death certificate filed THEN distribute assets"
  trigger: string; // e.g. "Death certificate filed"
  outcome: string; // e.g. "Distribute assets per percentages"
  type: 'time-gate' | 'event' | 'threshold';
}

export interface ContractAsset {
  description: string; // e.g. "Estate assets"
  type: 'usdc' | 'property' | 'rights' | 'tokens' | 'other';
  amount?: string | null;
  beneficiary: string; // party id
}

export interface ContractTimeline {
  event: string;
  date?: string | null;
  relativeDays?: number | null;
  description: string;
}

export interface ContractModel {
  title: string;
  parties: ContractParty[];
  obligations: ContractObligation[];
  conditions: ContractCondition[];
  assets: ContractAsset[];
  timeline: ContractTimeline[];
}

/** Request body for POST /api/agent/extract */
export interface ExtractionRequest {
  documentText: string;
  format?: 'json' | 'svg' | 'both';
  contextHint?: AgentContextHint;
  privacyMode?: 'public' | 'semi-private' | 'fully-private';
}

/** Response from POST /api/agent/extract */
export interface ExtractionResponse {
  extractionId: string;
  contractModel: ContractModel;
  svg?: string; // SVG string if format includes svg
  modelUsed: string;
  processingTimeMs: number;
  generatedAt: string;
}

// ── Legal Clarity Agent (Phase 3 — Circle Agent Marketplace) ──

/** Legal knowledge Q&A request — conversational, web-research-backed */
export interface LegalKnowledgeRequest {
  /** Natural language question (e.g., "What legal structures for my web3 startup?") */
  query: string;
  /** Optional jurisdiction filter */
  jurisdiction?: string;
  /** Optional entity type for context */
  entityType?: 'individual' | 'business' | 'notary' | 'government' | 'startup';
  /** Maximum web sources to consult (default 3) */
  maxSources?: number;
}

export interface LegalKnowledgeSource {
  title: string;
  url: string;
  snippet: string;
  relevance: 'high' | 'medium' | 'low';
}

export interface LegalKnowledgeResponse {
  /** Unique response ID */
  responseId: string;
  /** The original query */
  query: string;
  /** Synthesized guidance (WITH disclaimer) */
  guidance: string;
  /** Key legal areas identified */
  areas: string[];
  /** Actionable next steps (not legal advice) */
  nextSteps: string[];
  /** Sources consulted */
  sources: LegalKnowledgeSource[];
  /** Mandatory disclaimer */
  disclaimer: string;
  /** Metadata */
  generatedAt: string;
  processingTimeMs: number;
}

/** x402 nanopayment service descriptor — what gets listed on Circle Marketplace */
export interface X402ServiceListing {
  /** Unique service ID */
  serviceId: string;
  /** Human-readable name */
  name: string;
  /** Short description for marketplace */
  description: string;
  /** Full documentation URL */
  docsUrl: string;
  /** x402 endpoint URL */
  endpoint: string;
  /** Price in USDC (nanopayment — 6 decimals) */
  priceUSDC: number;
  /** Supported operations */
  operations: {
    analyze: { price: number; description: string };
    knowledge: { price: number; description: string };
    witness: { price: number; description: string };
    timestamp: { price: number; description: string };
    compliance: { price: number; description: string };
    reputation: { price: number; description: string };
    oracle: { price: number; description: string };
    milestone: { price: number; description: string };
    translate: { price: number; description: string };
  };
  /** Rate limits */
  rateLimit: {
    requestsPerMinute: number;
    maxDocumentSizeBytes: number;
  };
  /** Wallet address that receives payments */
  receivesPaymentAt: string;
}

/** Circle agent wallet identity — metadata stored alongside on-chain wallet */
export interface AgentWalletIdentity {
  walletId: string;
  chainId: number;
  address: string;
  displayName: string;
  serviceId: string;
  createdAt: string;
}

/** Witness operation — Sigil acts as neutral third-party witness for agent-to-agent agreements */
export interface WitnessRequest {
  /** What is being witnessed (e.g., "Agent A deposited 50 USDC into escrow") */
  event: string;
  /** Hash of the evidence/document being witnessed */
  evidenceHash: string;
  /** Optional evidence URI (IPFS CID or HTTPS URL) */
  evidenceUri?: string;
  /** Parties involved in the agreement */
  parties: {
    initiator: string; // wallet address or agent ID
    counterparty: string; // wallet address or agent ID
  };
  /** Chain ID where the agreement executes */
  chainId: number;
  /** Optional memo for the Arc journal entry */
  memo?: string;
}

export interface WitnessResponse {
  witnessId: string;
  /** EAS attestation UID on Base */
  attestationUid: string;
  /** Arc memo ID if on Arc */
  memoId?: string;
  /** Timestamp */
  witnessedAt: string;
  /** Transaction hashes */
  txn?: {
    attestationTx: string;
    memoTx?: string;
  };
}

/** Escrow witness flow: deposit → verify → attest → release */
export interface EscrowWitnessRequest {
  /** Escrow contract address or Circle payment ID */
  escrowId: string;
  /** Amount in USDC (6 decimals) */
  amountUSDC: string;
  /** The deliverable being escrowed for */
  deliverableDescription: string;
  /** Hash of the deliverable spec */
  deliverableHash: string;
  parties: {
    depositor: string;
    beneficiary: string;
  };
  chainId: number;
}

export interface EscrowWitnessResponse {
  escrowWitnessId: string;
  phase: 'deposited' | 'verified' | 'attested' | 'released' | 'disputed';
  depositAttestationUid: string;
  verificationAttestationUid?: string;
  releaseAttestationUid?: string;
  disputeAttestationUid?: string;
  memoId?: string;
  createdAt: string;
  updatedAt: string;
}

/** Timestamp — Proof of existence: attest a document existed at a specific time */
export interface TimestampRequest {
  /** Hash of the content being timestamped */
  contentHash: string;
  /** Optional content URI (IPFS CID or HTTPS URL) */
  contentUri?: string;
  /** Description of what is being timestamped */
  description: string;
  /** Chain ID */
  chainId: number;
}

export interface TimestampResponse {
  timestampId: string;
  /** EAS attestation UID */
  attestationUid: string;
  /** Arc memo ID */
  memoId?: string;
  /** ISO 8601 timestamp of attestation */
  attestedAt: string;
}

/** Compliance — Regulatory compliance audit attestation */
export interface ComplianceRequest {
  /** The agent or entity being audited */
  subjectId: string;
  /** The compliance standard being checked (e.g., "ABA-AI-2025", "GDPR-Art22") */
  standard: string;
  /** Evidence to audit */
  evidenceHash: string;
  /** Optional evidence URI */
  evidenceUri?: string;
  /** Description of what's being audited */
  description: string;
  chainId: number;
}

export interface ComplianceResponse {
  complianceId: string;
  /** Whether the subject passes the compliance standard */
  compliant: boolean;
  /** Findings — specific issues or confirmations */
  findings: string[];
  /** EAS attestation UID */
  attestationUid: string;
  /** Standard applied */
  standard: string;
  auditedAt: string;
}

/** Reputation — Agent reputation score attestation */
export interface ReputationRequest {
  /** The agent whose reputation is being queried */
  agentId: string;
  /** Scope of reputation query */
  scope?: 'all' | 'witness' | 'dispute' | 'escrow';
  chainId: number;
}

export interface ReputationResponse {
  reputationId: string;
  agentId: string;
  /** Number of completed agreements witnessed */
  completedAgreements: number;
  /** Number of disputes */
  totalDisputes: number;
  /** Dispute rate (0-1) */
  disputeRate: number;
  /** Average resolution time in hours */
  avgResolutionHours: number;
  /** Reputation tier */
  tier: 'trusted' | 'verified' | 'new' | 'disputed';
  /** EAS attestation UID */
  attestationUid: string;
  generatedAt: string;
}

/** Oracle — Legal event oracle: research a question and attest an answer on-chain */
export interface OracleRequest {
  /** The question to research */
  query: string;
  /** Optional jurisdiction filter */
  jurisdiction?: string;
  /** Maximum web sources to consult */
  maxSources?: number;
  chainId: number;
}

export interface OracleResponse {
  oracleId: string;
  query: string;
  /** The attested answer */
  answer: string;
  /** Sources consulted */
  sources: Array<{ title: string; url: string; snippet: string }>;
  /** Confidence level */
  confidence: 'high' | 'medium' | 'low';
  /** EAS attestation UID */
  attestationUid: string;
  generatedAt: string;
}

/** Milestone — Standalone deliverable verification (lighter than full escrow) */
export interface MilestoneRequest {
  /** Description of the milestone */
  description: string;
  /** Hash of the deliverable */
  deliverableHash: string;
  /** Hash of the acceptance criteria/spec */
  specHash: string;
  /** Optional deliverable URI */
  deliverableUri?: string;
  parties: {
    assignee: string;
    reviewer: string;
  };
  chainId: number;
}

export interface MilestoneResponse {
  milestoneId: string;
  /** Whether the milestone is verified */
  verified: boolean;
  /** Findings */
  findings: string[];
  /** EAS attestation UID */
  attestationUid: string;
  verifiedAt: string;
}

/** Translate — Translation fidelity attestation */
export interface TranslateRequest {
  /** Source language */
  sourceLanguage: string;
  /** Target language */
  targetLanguage: string;
  /** Hash of the source document */
  sourceHash: string;
  /** Hash of the translation */
  translationHash: string;
  /** Optional URIs */
  sourceUri?: string;
  translationUri?: string;
  chainId: number;
}

export interface TranslateResponse {
  translationId: string;
  /** Whether the translation is accurate */
  accurate: boolean;
  /** Specific discrepancies found */
  discrepancies: string[];
  /** EAS attestation UID */
  attestationUid: string;
  attestedAt: string;
}

/** Dispute resolution — Sigil as neutral arbitrator */
export interface DisputeResolutionRequest {
  /** The escrow or agreement being disputed */
  escrowWitnessId: string;
  /** Evidence from party A */
  initiatorEvidence: {
    description: string;
    evidenceHash: string;
    evidenceUri?: string;
  };
  /** Evidence from party B */
  counterpartyEvidence: {
    description: string;
    evidenceHash: string;
    evidenceUri?: string;
  };
}

export interface DisputeResolutionResponse {
  disputeId: string;
  /** Sigil's ruling */
  ruling: 'for_initiator' | 'for_counterparty' | 'split' | 'inconclusive';
  /** Explanation of the ruling */
  reasoning: string;
  /** Binding attestation UID */
  rulingAttestationUid: string;
  /** Recommended action */
  recommendedAction:
    | 'release_to_initiator'
    | 'release_to_counterparty'
    | 'split_and_release'
    | 'manual_review';
  resolvedAt: string;
}

/** Unified agent status response from GET /api/agent/status */
export interface AgentStatusResponse {
  wallet: {
    address: string;
    chain: string;
    balanceUSDC: string;
  };
  identity: {
    attested: boolean;
    agentId?: string;
    creatorAddress?: string;
    attestationUid?: string;
    registeredAt?: string;
  };
  x402: {
    listed: boolean;
    serviceId: string;
    marketplaceUrl: string;
    pricing: Record<string, number>;
  };
  casper?: {
    wallet?: string;
    network?: string;
    attestationsCount?: number;
    contractHash?: string;
  };
  uptime: string;
  version: string;
}
