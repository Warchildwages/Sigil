/**
 * Vera — Core Types
 */

/** An agent discovered on the Casper registry */
export interface AgentRecord {
  agentId: string;
  name: string;
  description: string;
  ed25519PublicKey: string;
  endpoint: string;
  capabilities: string[];
  chains: string[];
  didNostrUrl?: string;
  registeredAt: string;
}

/** Verification result for a single agent */
export interface VerificationResult {
  agentId: string;
  keyValid: boolean;
  keyDetail?: string;
  endpointReachable: boolean;
  endpointDetail?: string;
  didNostrValid: boolean;
  didNostrDetail?: string;
  timestamp: string;
}

/** Evaluation score for a single agent */
export interface EvaluationScore {
  agentId: string;
  overall: number;
  identity: number;
  capability: number;
  reliability: number;
  dimensions: { name: string; score: number; detail: string }[];
  testedAt: string;
  expiresAt: string;
}

/** A reputation event (transaction, dispute, report) */
export interface ReputationEvent {
  eventId: string;
  agentId: string;
  type: 'transaction' | 'dispute' | 'report' | 'verification';
  outcome: 'positive' | 'negative' | 'neutral' | 'pending';
  source: string;
  detail: string;
  evidenceCid?: string;
  timestamp: string;
}

/** Full agent profile returned to querying agents */
export interface AgentProfile {
  agentId: string;
  name: string;
  description: string;
  endpoint: string;
  capabilities: string[];
  chains: string[];
  didNostrUrl?: string;
  verification: VerificationResult;
  evaluation: EvaluationScore | null;
  reputation: {
    totalTransactions: number;
    successfulTransactions: number;
    disputes: number;
    unresolvedDisputes: number;
    reports: number;
    recentEvents: ReputationEvent[];
  };
  warnings: string[];
  lastUpdated: string;
}

/** Vera's service-info for x402 discovery */
export interface VeraServiceInfo {
  serviceId: string;
  name: string;
  description: string;
  endpoint: string;
  operations: {
    discover: { price: number; description: string };
    evaluate: { price: number; description: string };
    query: { price: number; description: string };
    report: { price: number; description: string };
  };
}
