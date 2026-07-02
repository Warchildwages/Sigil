// ERC-8004 Agent Identity Registration
//
// Registers the Signet Legal Clarity Agent on any EVM chain with an onchain
// identity that carries metadata (name, capabilities, service endpoints).
// Works on Base Sepolia (84532), Arc Testnet (5042002), and any EVM.
//
// ERC-8004 emits: AgentRegistered(agentId indexed, owner indexed, metadataURI, capabilities[])
// The metadataURI points to an IPFS/HTTPS JSON file conforming to AgentMetadata.
//
// Together with the Circle Agent Wallet (for x402 payments) and EAS (for
// attestations), this gives the agent a verifiable three-part identity:
//   wallet (payment) + ERC-8004 (identity) + EAS (proof of work)

import type { AgentCapability, AgentIdentity, AgentMetadata } from '@signet/shared';
import { encodeAbiParameters, keccak256, parseAbiParameters } from 'viem';

/** ERC-8004 Agent Registry ABI — minimal interface for AgentRegistered event */
export const ERC8004_REGISTRY_ABI = [
  'event AgentRegistered(bytes32 indexed agentId, address indexed owner, string metadataURI, string[] capabilities)',
  'function registerAgent(string metadataURI, string[] capabilities) returns (bytes32 agentId)',
  'function getAgent(bytes32 agentId) view returns (address owner, string metadataURI, string[] capabilities, uint256 registeredAt)',
  'function isAgent(bytes32 agentId) view returns (bool)',
] as const;

/** Predeployed ERC-8004 registry addresses */
export const ERC8004_REGISTRY_ADDRESSES: Record<number, string> = {
  // Arc Testnet
  5042002: '0x0000000000000000000000000000000000000800', // Placeholder — update with actual Arc deploy
  // Base Sepolia
  84532: '0x0000000000000000000000000000000000000800', // Placeholder — update with actual Base deploy
  // Base Mainnet
  8453: '0x0000000000000000000000000000000000000800', // Placeholder
};

/**
 * Generate a deterministic agentId from the agent's wallet address and service ID.
 * agentId = keccak256(abi.encode(address, string(serviceId)))
 * This ensures the same wallet+service pair always produces the same agentId.
 */
export function generateAgentId(address: string, serviceId: string): string {
  return keccak256(
    encodeAbiParameters(parseAbiParameters('address, string'), [
      address as `0x${string}`,
      serviceId,
    ]),
  );
}

/**
 * Build the default Signet Legal Clarity Agent metadata object.
 * This is what gets pinned to IPFS and referenced by metadataURI.
 */
export function buildAllCapabilities(serviceEndpoint: string): AgentCapability[] {
  return [
    {
      name: 'document-analysis',
      description:
        'AI-powered legal document risk and completeness analysis. Identifies imbalanced clauses, missing provisions, and compliance issues.',
      endpoint: `${serviceEndpoint}/api/x402/analyze`,
      priceUSDC: 0.01,
    },
    {
      name: 'legal-knowledge',
      description:
        'Web-researched legal guidance with mandatory disclaimers. Not legal advice — informational only.',
      endpoint: `${serviceEndpoint}/api/x402/knowledge`,
      priceUSDC: 0.005,
    },
    {
      name: 'notary-attestation',
      description:
        'Passkey-signed document attestation on Base EAS with Arc transaction memo journal entries.',
      attestationSchemas: [],
      endpoint: `${serviceEndpoint}/api/attest`,
    },
    {
      name: 'witness',
      description:
        'Neutral third-party witness for agent-to-agent agreements. Attests escrow deposits, deliverable verification, and binding dispute resolution with immutable Arc memo journal entries.',
      endpoint: `${serviceEndpoint}/api/x402/witness`,
      priceUSDC: 0.02,
    },
    {
      name: 'timestamp',
      description:
        'Proof of existence: attest a document, codebase, or evidence existed at a specific time. Immutable EAS attestation + Arc memo.',
      endpoint: `${serviceEndpoint}/api/x402/timestamp`,
      priceUSDC: 0.005,
    },
    {
      name: 'compliance',
      description:
        'Regulatory compliance audit: verify an agent or process meets a compliance standard. Attestation of findings.',
      endpoint: `${serviceEndpoint}/api/x402/compliance`,
      priceUSDC: 0.05,
    },
    {
      name: 'reputation',
      description:
        'Agent reputation score attestation: completed agreements, dispute rate, average resolution time, reputation tier. Attested on EAS — cannot be forged.',
      endpoint: `${serviceEndpoint}/api/x402/reputation`,
      priceUSDC: 0.03,
    },
    {
      name: 'oracle',
      description:
        'Legal event oracle: research a question via web + deterministic sources, attest the answer on-chain for smart contract consumption.',
      endpoint: `${serviceEndpoint}/api/x402/oracle`,
      priceUSDC: 0.05,
    },
    {
      name: 'milestone',
      description:
        'Standalone deliverable verification (lighter than full escrow). Verify a milestone against acceptance criteria, attest completion.',
      endpoint: `${serviceEndpoint}/api/x402/milestone`,
      priceUSDC: 0.01,
    },
    {
      name: 'translate',
      description:
        'Translation fidelity attestation: verify a translation is faithful to the source document. Attest accuracy or specific discrepancies.',
      endpoint: `${serviceEndpoint}/api/x402/translate`,
      priceUSDC: 0.03,
    },
  ];
}

export function buildDefaultAgentMetadata(
  serviceEndpoint: string,
  builderCode?: string,
): AgentMetadata {
  const capabilities = buildAllCapabilities(serviceEndpoint);

  return {
    name: 'Sigil — Legal Clarity Agent by Signet',
    description:
      'AI agent for legal document analysis, onchain notarization, and contract mediation. Accepts x402 nanopayments via Circle Agent Wallet.',
    serviceEndpoint,
    capabilities,
    builderCode,
    serviceId: 'sigil-v1',
    version: '1.0.0',
  };
}

/**
 * Register the agent on an ERC-8004 registry.
 *
 * This is a placeholder — actual registration requires a wallet to sign the
 * transaction. Wire this through `executeAgentCall` in agent-wallet.ts once
 * the Circle wallet is funded and the registry address is confirmed.
 *
 * @param chainId - EVM chain ID
 * @param address - Agent wallet address
 * @param serviceId - Unique service identifier
 * @param metadataURI - IPFS/HTTPS URI to AgentMetadata JSON
 * @param capabilities - Array of capability name strings for the event
 * @returns AgentIdentity object
 */
export async function registerAgentIdentity(
  chainId: number,
  address: string,
  serviceId: string,
  metadataURI: string,
  capabilities: string[],
): Promise<AgentIdentity> {
  const agentId = generateAgentId(address, serviceId);
  const registryAddress = ERC8004_REGISTRY_ADDRESSES[chainId];

  if (!registryAddress || registryAddress.startsWith('0x000000000000')) {
    console.warn(
      `[agent-identity] No ERC-8004 registry deployed on chain ${chainId}. ` +
        'Agent identity will be tracked off-chain until a registry is available.',
    );
  }

  // TODO: Call registry.registerAgent(metadataURI, capabilities) via agent wallet
  // When implemented, this will emit AgentRegistered(agentId, address, metadataURI, capabilities)

  return {
    agentId,
    walletId: '', // Populated by caller after wallet creation
    chainId,
    address,
    displayName: `Sigil (Chain ${chainId})`,
    metadataURI,
    registered: !!registryAddress && !registryAddress.startsWith('0x000000000000'),
    registeredAt: new Date().toISOString(),
  };
}

/**
 * Get the ERC-8004 registry address for a chain, or null if not deployed.
 */
export function getRegistryAddress(chainId: number): string | null {
  const addr = ERC8004_REGISTRY_ADDRESSES[chainId];
  if (!addr || addr.startsWith('0x000000000000')) return null;
  return addr;
}
