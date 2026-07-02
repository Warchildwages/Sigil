// 🦅 Sigil Operation Types
//
// Centralized operation definitions mirroring Luna's luna-types.ts pattern.
// Single source of truth for all 11 legal operations.

// ---------------------------------------------------------------------------
// Operation Union
// ---------------------------------------------------------------------------

export type SigilOperation =
  | 'witness'
  | 'escrow'
  | 'dispute'
  | 'compliance'
  | 'milestone'
  | 'oracle'
  | 'reputation'
  | 'timestamp'
  | 'translate'
  | 'analyze'
  | 'knowledge';

export const SIGIL_OPERATIONS: SigilOperation[] = [
  'witness',
  'escrow',
  'dispute',
  'compliance',
  'milestone',
  'oracle',
  'reputation',
  'timestamp',
  'translate',
  'analyze',
  'knowledge',
];

// ---------------------------------------------------------------------------
// Pricing (USDC per operation)
// ---------------------------------------------------------------------------

export const SIGIL_PRICING: Record<SigilOperation, number> = {
  witness: 0.03,
  escrow: 0.05,
  dispute: 0.04,
  compliance: 0.03,
  milestone: 0.01,
  oracle: 0.05,
  reputation: 0.03,
  timestamp: 0.01,
  translate: 0.03,
  analyze: 0.02,
  knowledge: 0.01,
};

// ---------------------------------------------------------------------------
// Display Names
// ---------------------------------------------------------------------------

export const SIGIL_OPERATION_NAMES: Record<SigilOperation, string> = {
  witness: 'Witness Document',
  escrow: 'Escrow Service',
  dispute: 'Open Dispute',
  compliance: 'Compliance Check',
  milestone: 'Milestone Verification',
  oracle: 'Oracle Query',
  reputation: 'Reputation Lookup',
  timestamp: 'Timestamp Document',
  translate: 'Translation Verification',
  analyze: 'Document Analysis',
  knowledge: 'Legal Knowledge Query',
};

// ---------------------------------------------------------------------------
// Descriptions (for NLU catalog and endpoints)
// ---------------------------------------------------------------------------

export const SIGIL_OPERATION_DESCRIPTIONS: Record<SigilOperation, string> = {
  witness: 'Witness a document or event. On-chain proof of existence via Casper AgentAttest and Base EAS.',
  escrow: 'Deposit, hold, and release funds when conditions are met. For domain transfers, M&A, and contractor payments.',
  dispute: 'Open a dispute on an active escrow. Submit evidence and request human review.',
  compliance: 'Check a document or process for regulatory compliance — SOC 2, HIPAA, KYC, AML, GDPR.',
  milestone: 'Verify that a milestone has been completed. Record proof of delivery or achievement on-chain.',
  oracle: 'Query deadlines, regulatory dates, or market data. Get notarized answers with verified sources.',
  reputation: 'Look up an agent or entity\'s reputation score — completed agreements, dispute rate, trust tier.',
  timestamp: 'Timestamp a document hash on-chain. Proof of existence at a specific point in time.',
  translate: 'Verify a legal document translation for accuracy. Compare source and target, flag discrepancies.',
  analyze: 'Full document analysis with AI. Extract clauses, obligations, risks, and deadlines in plain English.',
  knowledge: 'Query Sigil\'s legal knowledge base. Ask about legal concepts, regulations, or document requirements.',
};

// ---------------------------------------------------------------------------
// Endpoint Map
// ---------------------------------------------------------------------------

export const SIGIL_ENDPOINTS: Record<SigilOperation, string> = {
  witness: '/api/x402/witness',
  escrow: '/api/x402/witness/escrow',
  dispute: '/api/x402/witness/dispute',
  compliance: '/api/x402/compliance',
  milestone: '/api/x402/milestone',
  oracle: '/api/x402/oracle',
  reputation: '/api/x402/reputation',
  timestamp: '/api/x402/timestamp',
  translate: '/api/x402/translate',
  analyze: '/api/x402/analyze',
  knowledge: '/api/x402/knowledge',
};
