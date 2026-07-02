// ── ERC-8004 Agent Identity ──
// Onchain agent registration standard (cross-EVM).
// An agent registers its identity → emits AgentRegistered event.
// The identity carries metadata, capabilities, and service endpoints.

/** Status of the agent's x402 service listing on Circle Marketplace */
export interface AgentServiceStatus {
  serviceId: string;
  name: string;
  listed: boolean;
  marketplaceUrl: string;
  operations: {
    analyze: { price: number; available: boolean };
    knowledge: { price: number; available: boolean };
  };
}

/** A capability the agent advertises on-chain */
export interface AgentCapability {
  /** Human-readable capability name (e.g., "document-analysis") */
  name: string;
  /** Short description for discovery */
  description: string;
  /** Schema UIDs the agent can attest with (EAS on Base) */
  attestationSchemas?: string[];
  /** x402 service endpoint for this capability */
  endpoint?: string;
  /** Price in USDC (6 decimals) for this capability */
  priceUSDC?: number;
}

/** Onchain metadata stored at metadataURI (IPFS or HTTPS) */
export interface AgentMetadata {
  /** Agent display name */
  name: string;
  /** Short description */
  description: string;
  /** Service endpoint (base URL for x402) */
  serviceEndpoint: string;
  /** Agent capabilities */
  capabilities: AgentCapability[];
  /** Builder code for Base attribution */
  builderCode?: string;
  /** Programmatic identifier for the agent (e.g., "signet-legal-clarity-v1") */
  serviceId: string;
  /** Version */
  version: string;
}

/** Full agent identity — wallet + onchain registration */
export interface AgentIdentity {
  /** ERC-8004 agentId (bytes32 emitted in AgentRegistered event) */
  agentId: string;
  /** Circle Agent Wallet ID */
  walletId: string;
  /** Chain ID where the identity is registered */
  chainId: number;
  /** Wallet address */
  address: string;
  /** Display name */
  displayName: string;
  /** IPFS or HTTPS URI pointing to AgentMetadata JSON */
  metadataURI: string;
  /** Whether the identity is registered on-chain */
  registered: boolean;
  /** Timestamp of registration */
  registeredAt?: string;
}