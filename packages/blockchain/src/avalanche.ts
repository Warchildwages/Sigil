// Avalanche C-Chain Deployment Utilities
//
// Registers Signet's EAS schemas and agent identity on Avalanche C-Chain
// (43114 mainnet, 43113 Fuji testnet). Avalanche C-Chain is EVM-compatible
// so all existing EAS + agent identity code works with different chain config.
//
// Phase 2 (P2): Deploy Signet agent on Avalanche C-Chain (~2h).

import type { ChainConfig } from '@sigil/shared';
import type { AgentIdentity } from '@sigil/shared';

/** Avalanche C-Chain configurations — matching ChainConfig shape from @sigil/shared */
export const AVALANCHE_CHAINS: Record<string, ChainConfig> = {
  mainnet: {
    chainId: 43114,
    name: 'Avalanche C-Chain',
    rpcUrl: 'https://api.avax.network/ext/bc/C/rpc',
    explorerUrl: 'https://snowtrace.io',
    modularWalletPath: '/avalanche',
    isTestnet: false,
    easContractAddress: '0x4200000000000000000000000000000000000021',
  },
  fuji: {
    chainId: 43113,
    name: 'Avalanche Fuji Testnet',
    rpcUrl: 'https://api.avax-test.network/ext/bc/C/rpc',
    explorerUrl: 'https://testnet.snowtrace.io',
    modularWalletPath: '/avalancheFuji',
    isTestnet: true,
  },
};

/**
 * Get Avalanche C-Chain configuration for a given network.
 */
export function getAvalancheChainConfig(network: 'mainnet' | 'fuji'): ChainConfig {
  const config = AVALANCHE_CHAINS[network];
  if (!config) {
    throw new Error(`Unknown Avalanche network: ${network}. Use 'mainnet' or 'fuji'.`);
  }
  return config;
}

/**
 * Get Snowtrace explorer URL for a transaction.
 */
export function getAvalancheExplorerUrl(chainId: number, txHash: string): string {
  if (chainId === 43114) {
    return `https://snowtrace.io/tx/${txHash}`;
  }
  if (chainId === 43113) {
    return `https://testnet.snowtrace.io/tx/${txHash}`;
  }
  throw new Error(`Unsupported Avalanche chain ID: ${chainId}`);
}

/**
 * Register the Signet agent identity on Avalanche.
 *
 * NOTE: Placeholder — actual registration requires a funded wallet
 * on Avalanche C-Chain and a deployed ERC-8004 registry.
 *
 * @param network - 'mainnet' or 'fuji'
 * @param address - Agent wallet address on Avalanche
 * @param serviceId - Service identifier
 * @returns AgentIdentity with Avalanche chain info
 */
export async function registerAgentOnAvalanche(
  network: 'mainnet' | 'fuji',
  address: string,
  serviceId: string,
): Promise<AgentIdentity> {
  const config = getAvalancheChainConfig(network);

  // Generate deterministic agentId (same algorithm as Base/Arc)
  const { keccak256, encodeAbiParameters, parseAbiParameters } = await import('viem');
  const agentId = keccak256(
    encodeAbiParameters(parseAbiParameters('address, string'), [
      address as `0x${string}`,
      serviceId,
    ]),
  );

  console.log(`[avalanche] Agent identity ready for registration on ${config.name}`);
  console.log(`  chainId: ${config.chainId}`);
  console.log(`  agentId: ${agentId}`);
  console.log(`  address: ${address}`);

  // TODO: Call ERC-8004 registry.registerAgent() on Avalanche
  // Requires: deployed ERC-8004 registry address on Avalanche

  return {
    agentId,
    walletId: '', // Populated after wallet creation on Avalanche
    chainId: config.chainId,
    address,
    displayName: `Sigil (Avalanche ${network === 'mainnet' ? 'C-Chain' : 'Fuji'})`,
    metadataURI: '', // Populated after IPFS pinning
    registered: false, // Set to true after on-chain registration
    registeredAt: new Date().toISOString(),
  };
}
