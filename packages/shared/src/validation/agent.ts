import { z } from 'zod';

export const autoDetectedContextSchema = z.enum([
  'consumer-contract',
  'business-agreement',
  'notarized-document',
  'general-legal',
]);

export const agentContextHintSchema = z
  .object({
    entityType: z.enum(['individual', 'business', 'notary', 'government']).optional(),
    jurisdiction: z.string().optional(),
    counterpartyName: z.string().optional(),
  })
  .optional();

export const agentAnalysisRequestSchema = z.object({
  documentText: z.string().min(1, 'Document text is required'),
  contextHint: agentContextHintSchema,
});

const clauseFindingSchema = z.object({
  clause: z.string(),
  concern: z.string(),
  recommendation: z.string(),
  risk: z.enum(['low', 'moderate', 'high', 'critical']),
});

const requiredElementsSchema = z.object({
  signatures: z.boolean(),
  dates: z.boolean(),
  parties: z.boolean(),
  terms: z.boolean(),
  governingLaw: z.boolean(),
});

const documentCompletenessSchema = z.object({
  isComplete: z.boolean(),
  missingElements: z.array(z.string()),
  requiredElements: requiredElementsSchema,
  warnings: z.array(z.string()),
});

export const agentAnalysisResponseSchema = z.object({
  analysisId: z.string(),
  autoDetectedContext: autoDetectedContextSchema,
  overallRisk: z.enum(['low', 'moderate', 'high', 'critical']),
  findings: z.array(clauseFindingSchema),
  recommendation: z.enum(['sign', 'review', 'reject']),
  completeness: documentCompletenessSchema.nullable(),
  generatedAt: z.string(),
  modelUsed: z.string(),
  processingTimeMs: z.number(),
});

// ── Legal Clarity Agent (Phase 3 — Circle Agent Marketplace) ──

export const legalKnowledgeRequestSchema = z.object({
  query: z.string().min(1, 'Query is required').max(2000, 'Query too long'),
  jurisdiction: z.string().optional(),
  entityType: z.enum(['individual', 'business', 'notary', 'government', 'startup']).optional(),
  maxSources: z.number().min(1).max(10).optional(),
});

export const legalKnowledgeSourceSchema = z.object({
  title: z.string(),
  url: z.string(),
  snippet: z.string(),
  relevance: z.enum(['high', 'medium', 'low']),
});

export const legalKnowledgeResponseSchema = z.object({
  responseId: z.string(),
  query: z.string(),
  guidance: z.string(),
  areas: z.array(z.string()),
  nextSteps: z.array(z.string()),
  sources: z.array(legalKnowledgeSourceSchema),
  disclaimer: z.string(),
  generatedAt: z.string(),
  processingTimeMs: z.number(),
});

export const x402ServiceListingSchema = z.object({
  serviceId: z.string(),
  name: z.string(),
  description: z.string(),
  docsUrl: z.string(),
  endpoint: z.string(),
  priceUSDC: z.number(),
  operations: z.object({
    analyze: z.object({ price: z.number(), description: z.string() }),
    knowledge: z.object({ price: z.number(), description: z.string() }),
  }),
  rateLimit: z.object({
    requestsPerMinute: z.number(),
    maxDocumentSizeBytes: z.number(),
  }),
  receivesPaymentAt: z.string(),
});

export const agentWalletIdentitySchema = z.object({
  walletId: z.string(),
  chainId: z.number(),
  address: z.string(),
  displayName: z.string(),
  serviceId: z.string(),
  createdAt: z.string(),
});

// ── x402 Service Schemas (Phase B — Production Hardening) ──

export const witnessRequestSchema = z.object({
  event: z.string().min(1, 'event is required'),
  evidenceHash: z.string().min(64, 'evidenceHash must be a valid hex hash (64+ chars)'),
  evidenceUri: z.string().optional(),
  parties: z.object({
    initiator: z.string().min(1, 'parties.initiator is required'),
    counterparty: z.string().min(1, 'parties.counterparty is required'),
  }),
  chainId: z.number().int().positive('chainId is required'),
  memo: z.string().optional(),
});

export const escrowWitnessRequestSchema = z.object({
  escrowId: z.string().min(1, 'escrowId is required'),
  amountUSDC: z.string().min(1, 'amountUSDC is required'),
  deliverableDescription: z.string().min(1, 'deliverableDescription is required'),
  deliverableHash: z.string().min(64, 'deliverableHash must be a valid hex hash (64+ chars)'),
  parties: z.object({
    depositor: z.string().min(1, 'parties.depositor is required'),
    beneficiary: z.string().min(1, 'parties.beneficiary is required'),
  }),
  chainId: z.number().int().positive('chainId is required'),
  phase: z.enum(['deposited', 'verified', 'attested', 'released', 'disputed']).optional(),
  evidenceHash: z.string().optional(),
});

export const disputeResolutionRequestSchema = z.object({
  escrowWitnessId: z.string().min(1, 'escrowWitnessId is required'),
  initiatorEvidence: z.object({
    description: z.string().min(1, 'initiatorEvidence.description is required'),
    evidenceHash: z.string().min(64, 'initiatorEvidence.evidenceHash must be a valid hex hash'),
    evidenceUri: z.string().optional(),
  }),
  counterpartyEvidence: z.object({
    description: z.string().min(1, 'counterpartyEvidence.description is required'),
    evidenceHash: z.string().min(64, 'counterpartyEvidence.evidenceHash must be a valid hex hash'),
    evidenceUri: z.string().optional(),
  }),
});

export const timestampRequestSchema = z.object({
  contentHash: z.string().min(64, 'contentHash must be a valid hex hash (64+ chars)'),
  contentUri: z.string().optional(),
  description: z.string().min(1, 'description is required'),
  chainId: z.number().int().positive('chainId is required'),
});

export const complianceRequestSchema = z.object({
  subjectId: z.string().min(1, 'subjectId is required'),
  standard: z.string().min(1, 'standard is required'),
  evidenceHash: z.string().min(64, 'evidenceHash must be a valid hex hash (64+ chars)'),
  evidenceUri: z.string().optional(),
  description: z.string().min(1, 'description is required'),
  chainId: z.number().int().positive('chainId is required'),
});

export const reputationRequestSchema = z.object({
  agentId: z.string().min(1, 'agentId is required'),
  scope: z.enum(['all', 'witness', 'dispute', 'escrow']).optional(),
  chainId: z.number().int().positive('chainId is required'),
});

export const oracleRequestSchema = z.object({
  query: z.string().min(1, 'query is required'),
  jurisdiction: z.string().optional(),
  maxSources: z.number().int().min(1).max(10).optional(),
  chainId: z.number().int().positive('chainId is required'),
});

export const milestoneRequestSchema = z.object({
  description: z.string().min(1, 'description is required'),
  deliverableHash: z.string().min(64, 'deliverableHash must be a valid hex hash (64+ chars)'),
  specHash: z.string().min(64, 'specHash must be a valid hex hash (64+ chars)'),
  deliverableUri: z.string().optional(),
  parties: z.object({
    assignee: z.string().min(1, 'parties.assignee is required'),
    reviewer: z.string().min(1, 'parties.reviewer is required'),
  }),
  chainId: z.number().int().positive('chainId is required'),
});

export const translateRequestSchema = z.object({
  sourceLanguage: z.string().min(1, 'sourceLanguage is required'),
  targetLanguage: z.string().min(1, 'targetLanguage is required'),
  sourceHash: z.string().min(64, 'sourceHash must be a valid hex hash (64+ chars)'),
  translationHash: z.string().min(64, 'translationHash must be a valid hex hash (64+ chars)'),
  sourceUri: z.string().optional(),
  translationUri: z.string().optional(),
  chainId: z.number().int().positive('chainId is required'),
});

export const x402ServiceListingSchemaV2 = z.object({
  serviceId: z.string(),
  name: z.string(),
  description: z.string(),
  docsUrl: z.string(),
  endpoint: z.string(),
  priceUSDC: z.number(),
  operations: z.object({
    analyze: z.object({ price: z.number(), description: z.string() }),
    knowledge: z.object({ price: z.number(), description: z.string() }),
    witness: z.object({ price: z.number(), description: z.string() }),
    timestamp: z.object({ price: z.number(), description: z.string() }),
    compliance: z.object({ price: z.number(), description: z.string() }),
    reputation: z.object({ price: z.number(), description: z.string() }),
    oracle: z.object({ price: z.number(), description: z.string() }),
    milestone: z.object({ price: z.number(), description: z.string() }),
    translate: z.object({ price: z.number(), description: z.string() }),
  }),
  rateLimit: z.object({
    requestsPerMinute: z.number(),
    maxDocumentSizeBytes: z.number(),
  }),
  receivesPaymentAt: z.string(),
});

/** Zod schema for AgentStatusResponse from GET /api/agent/status */
export const agentStatusResponseSchema = z.object({
  wallet: z.object({
    address: z.string(),
    chain: z.string(),
    balanceUSDC: z.string(),
  }),
  identity: z.object({
    attested: z.boolean(),
    agentId: z.string().optional(),
    creatorAddress: z.string().optional(),
    attestationUid: z.string().optional(),
    registeredAt: z.string().optional(),
  }),
  x402: z.object({
    listed: z.boolean(),
    serviceId: z.string(),
    marketplaceUrl: z.string(),
    pricing: z.record(z.string(), z.number()),
  }),
  uptime: z.string(),
  version: z.string(),
});
