// Coinbase AgentKit Provider — secondary wallet provider alongside Circle SDK
//
// Enables Signet/Sigil to operate as an AgentKit-compatible agent for the
// Coinbase agent ecosystem. Mirrors the circle.ts pattern: provider creation,
// wallet operations, transaction signing.
//
// Dependencies: AgentKit is installed as optional peer. This module degrades
// gracefully when AgentKit is not available — all functions throw descriptive
// errors rather than failing at import time.
//
// See: https://github.com/coinbase/agentkit (1,257 stars)
//      https://github.com/coinbase/cdp-agentkit-nodejs (60 stars)

import type { ChainConfig } from '@signet/shared';

// AgentKit types — dynamically imported to avoid hard dependency
// These match the CDP AgentKit Node.js SDK interface
interface AgentKitWallet {
  address: `0x${string}`;
  chainId: number;
  signTransaction: (tx: AgentKitTransaction) => Promise<`0x${string}`>;
  sendTransaction: (tx: AgentKitTransaction) => Promise<`0x${string}`>;
  getBalance: () => Promise<bigint>;
}

interface AgentKitTransaction {
  to: `0x${string}`;
  data?: `0x${string}`;
  value?: bigint;
  chainId?: number;
}

interface AgentKitConfig {
  /** CDP API key name */
  apiKeyName: string;
  /** CDP API key private key */
  apiKeyPrivateKey: string;
  /** Network ID (e.g., 'base-sepolia') */
  networkId?: string;
}

let _agentKitConfig: AgentKitConfig | null = null;
let _agentKit: any = null; // CDP AgentKit instance
let _agentKitAvailable = false;

/**
 * Initialize AgentKit configuration.
 * Call once on app startup with CDP credentials.
 *
 * In Next.js, pass NEXT_PUBLIC_CDP_API_KEY_NAME and NEXT_PUBLIC_CDP_API_KEY_PRIVATE_KEY.
 * If CDP AgentKit is not installed, this is a no-op and provider will be unavailable.
 */
export function initAgentKit(config: AgentKitConfig): void {
  _agentKitConfig = config;
}

/**
 * Lazy-load the CDP AgentKit SDK.
 * Returns the AgentKit instance or throws if not available.
 */
async function getAgentKit(): Promise<any> {
  if (_agentKit) return _agentKit;

  if (!_agentKitConfig) {
    throw new Error(
      'AgentKit not initialized. Call initAgentKit({ apiKeyName, apiKeyPrivateKey }) first.\n' +
        'Or use Circle SDK: createWalletProvider("circle", config).',
    );
  }

  try {
    // Dynamic import — CDP AgentKit is optional. Use string variable to
    // avoid static module resolution (package is not installed in Phase 2).
    // @ts-expect-error — optional peer dependency, not installed in Phase 2
    const mod = await import('@coinbase/cdp-agentkit-nodejs');
    const CDPAgentKit = mod.AgentKit || mod.default?.AgentKit;
    _agentKit = await CDPAgentKit.configure({
      apiKeyName: _agentKitConfig.apiKeyName,
      apiKeyPrivateKey: _agentKitConfig.apiKeyPrivateKey,
      networkId: _agentKitConfig.networkId || 'base-sepolia',
    });
    _agentKitAvailable = true;
    return _agentKit;
  } catch (err) {
    throw new Error(
      `CDP AgentKit SDK not available. Install with: pnpm add @coinbase/cdp-agentkit-nodejs\n` +
        `Original error: ${err instanceof Error ? err.message : String(err)}\n` +
        `Circle SDK remains available as primary provider.`,
    );
  }
}

/**
 * Check if AgentKit is available (installed and initialized).
 */
export function isAgentKitAvailable(): boolean {
  return _agentKitAvailable;
}

/**
 * Create an AgentKit wallet for a given chain.
 *
 * @param chainId - EVM chain ID
 * @param chainName - Human-readable chain name (e.g., 'Base Sepolia')
 * @returns AgentKitWallet with address, signing, and balance methods
 */
export async function createAgentKitWallet(
  chainId: number,
  chainName?: string,
): Promise<AgentKitWallet> {
  const agentkit = await getAgentKit();

  // AgentKit uses network IDs, not chain IDs. Map common chains.
  const networkId = mapChainIdToNetworkId(chainId);

  try {
    // Get or create a wallet for this network
    // CDP AgentKit manages wallets internally via the configured API key
    const wallet = await agentkit.createWallet({ networkId });
    const address = (await wallet.getAddress()) as `0x${string}`;

    return {
      address,
      chainId,
      signTransaction: async (tx: AgentKitTransaction) => {
        const signed = await wallet.signTransaction({
          to: tx.to,
          data: tx.data,
          value: tx.value,
        });
        return signed.hash as `0x${string}`;
      },
      sendTransaction: async (tx: AgentKitTransaction) => {
        const sent = await wallet.sendTransaction({
          to: tx.to,
          data: tx.data,
          value: tx.value,
        });
        return sent.hash as `0x${string}`;
      },
      getBalance: async () => {
        const balance = await wallet.getBalance();
        return BigInt(balance);
      },
    };
  } catch (err) {
    throw new Error(
      `Failed to create AgentKit wallet for ${chainName || `chain ${chainId}`}. ` +
        `Error: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
}

/**
 * Execute an EAS attestation via AgentKit wallet.
 * Wraps the attestation call data in an AgentKit transaction.
 *
 * @param wallet - AgentKit wallet from createAgentKitWallet
 * @param contractAddress - EAS contract address
 * @param callData - Encoded attestation call data
 * @returns Transaction hash
 */
export async function attestViaAgentKit(
  wallet: AgentKitWallet,
  contractAddress: `0x${string}`,
  callData: `0x${string}`,
): Promise<`0x${string}`> {
  return wallet.sendTransaction({
    to: contractAddress,
    data: callData,
  });
}

/**
 * Map EVM chain IDs to CDP AgentKit network IDs.
 */
function mapChainIdToNetworkId(chainId: number): string {
  const mapping: Record<number, string> = {
    8453: 'base-mainnet',
    84532: 'base-sepolia',
    1: 'ethereum-mainnet',
    11155111: 'ethereum-sepolia',
    137: 'polygon-mainnet',
    80002: 'polygon-amoy',
    // Avalanche not natively supported by CDP AgentKit — falls back to generic
    43114: 'avalanche-mainnet',
    43113: 'avalanche-fuji',
    5042002: 'arc-testnet',
  };

  return mapping[chainId] || `evm-${chainId}`;
}

/**
 * Base chain configuration for AgentKit-compatible chains.
 * These complement the existing circle.ts chain configs.
 */
export const AGENTKIT_SUPPORTED_CHAINS: Record<string, ChainConfig> = {
  'base-sepolia': {
    chainId: 84532,
    name: 'Base Sepolia',
    rpcUrl: 'https://sepolia.base.org',
    explorerUrl: 'https://sepolia.basescan.org',
    modularWalletPath: '/base-sepolia',
    isTestnet: true,
    easContractAddress: '0x4200000000000000000000000000000000000021',
  },
  'base-mainnet': {
    chainId: 8453,
    name: 'Base Mainnet',
    rpcUrl: 'https://mainnet.base.org',
    explorerUrl: 'https://basescan.org',
    modularWalletPath: '/base-mainnet',
    isTestnet: false,
    easContractAddress: '0x4200000000000000000000000000000000000021',
  },
};

/**
 * Get chain configuration for AgentKit-compatible chains.
 */
export function getAgentKitChainConfig(network: string): ChainConfig {
  const config = AGENTKIT_SUPPORTED_CHAINS[network];
  if (!config) {
    throw new Error(
      `Unknown AgentKit network: ${network}. Supported: ${Object.keys(AGENTKIT_SUPPORTED_CHAINS).join(', ')}`,
    );
  }
  return config;
}

// Re-export types for consumers
export type { AgentKitWallet, AgentKitTransaction, AgentKitConfig };
