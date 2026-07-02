/**
 * Agent Template & Deployment Types
 *
 * Core type system for @sigil/agent-core — the framework for spawning
 * domain-specific AI agents on Arc with bridges to Base, Ethereum, and Avalanche.
 *
 * Phase 3 — Signet Agent Framework
 */

import type { ChainConfig } from './chains.js';

// ── Agent Runtime Mode ──

export type AgentRuntimeMode = 'rest-server' | 'scheduled-job' | 'on-demand-function';

// ── Emphasis Vectors (what the agent prioritizes during analysis) ──

export type EmphasisVector =
  | 'consumer-protection'
  | 'contract-risk'
  | 'notary-compliance'
  | 'regulatory'
  | 'governance';

// ── Marketplace Listing (Circle Agent Marketplace) ──

export interface MarketplaceListing {
  /** Human-readable service name for marketplace */
  name: string;
  /** Short description */
  description: string;
  /** Price in USDC per analysis operation (6-decimal precision) */
  operationPrice: number;
}

// ── Agent Template ──

export interface AgentTemplate {
  /** Kebab-case unique ID, e.g. 'legal-clarity' */
  id: string;
  /** Human-readable name */
  name: string;
  /** Industry vertical */
  domain: string;
  /** One-sentence capability summary */
  description: string;
  /** Supported document type slugs */
  documentTypes: string[];
  /** Domain knowledge anchors used for prompt building */
  seedTexts: string[];
  /** Default analysis emphasis tags */
  defaultEmphasis: EmphasisVector[];
  /** Circle Marketplace listing metadata */
  marketplaceListing: MarketplaceListing;
  /** How this agent runs (REST server, cron job, or on-demand function) */
  runtimeMode: AgentRuntimeMode;
  /** Chain IDs this agent is validated and tested for */
  supportedChainIds: number[];
  /** Preferred chain ID for primary deployment */
  preferredChainId: number;
  /** Whether this agent supports on-chain EAS attestation of reports */
  attestationEnabled?: boolean;
  /** Whether this agent requires Arc confidential transfer privacy */
  privacyRequired?: boolean;
  /** Whether session key pre-authorization is supported */
  sessionKeyCompatible?: boolean;
  /** Whether Circle Gateway unified balance is enabled */
  gatewayEnabled?: boolean;
}

// ── Agent Deployment ──

export interface AgentDeployment {
  /** Unique agent instance ID */
  agentId: string;
  /** Template this agent was scaffolded from */
  templateId: string;
  /** On-chain wallet address that receives x402 payments */
  walletAddress: string;
  /** Chain ID where the agent is deployed */
  chainId: number;
  /** x402 payment endpoint URL */
  x402Endpoint: string;
  /** Knowledge Bank Prisma schema partition name */
  knowledgeBankSchema: string;
  /** ISO 8601 deployment timestamp */
  deployedAt: string;
  /** Current deployment status */
  status: 'active' | 'inactive' | 'error';
  /** Runtime mode for this deployment */
  runtimeMode: AgentRuntimeMode;
  /** Chain configuration at time of deployment */
  chainConfig: ChainConfig;
}

// ── Input Types ──

export interface CreateAgentInput {
  template: AgentTemplate;
  chainId: number;
  walletAddress: string;
  /** Optional name override for the agent instance */
  name?: string;
}

export interface TemplateNotFoundError extends Error {
  code: 'TEMPLATE_NOT_FOUND';
  templateId: string;
}

// ── Agent Runtime Interface ──

export interface AgentRuntime {
  start(): Promise<void>;
  stop(): Promise<void>;
  execute(input: unknown): Promise<unknown>;
  mode: AgentRuntimeMode;
  deployment: AgentDeployment;
}