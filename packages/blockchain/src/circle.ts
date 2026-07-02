// Circle Modular Wallet integration — passkey authentication, smart accounts, EIP-712 signing
// Dependencies: @circle-fin/modular-wallets-core, viem
//
// IMPORTANT: Requires CLIENT_KEY and CLIENT_URL from Circle Console.
// Passkey domain must be configured in Console to match the deployment origin.
// For local dev: http://localhost:3001
//
// The consumer (Next.js app) reads process.env and passes config via initSignetCircle().
//
// Supported chains (dual-chain strategy):
//   Base Sepolia (84532) — EAS attestations, public verifiability via EASscan
//   Arc Testnet (5042002) — USDC-native, sub-second finality, payments

import {
  WebAuthnMode,
  toCircleSmartAccount,
  toModularTransport,
  toPasskeyTransport,
  toWebAuthnCredential,
} from '@circle-fin/modular-wallets-core';
import { CHAIN_IDS } from '@signet/shared';
import { type Transport, createPublicClient } from 'viem';
import {
  type P256Credential,
  type SmartAccount,
  type WebAuthnAccount,
  createBundlerClient,
  toWebAuthnAccount,
} from 'viem/account-abstraction';
import { base, baseSepolia } from 'viem/chains';

// Arc Testnet viem chain definition
const arcTestnet = {
  id: CHAIN_IDS.ARC_TESTNET,
  name: 'Arc Testnet',
  nativeCurrency: { name: 'USDC', symbol: 'USDC', decimals: 6 },
  rpcUrls: {
    default: { http: [process.env.ARC_TESTNET_RPC || 'https://rpc.testnet.arc.circle.com'] },
  },
  blockExplorers: {
    default: { name: 'Arc Explorer', url: 'https://explorer.testnet.arc.circle.com' },
  },
  testnet: true,
} as const;

// Avalanche Fuji viem chain definition
const avalancheFuji = {
  id: CHAIN_IDS.AVALANCHE_FUJI,
  name: 'Avalanche Fuji Testnet',
  nativeCurrency: { name: 'AVAX', symbol: 'AVAX', decimals: 18 },
  rpcUrls: {
    default: {
      http: [process.env.AVALANCHE_FUJI_RPC_URL || 'https://api.avax-test.network/ext/bc/C/rpc'],
    },
  },
  blockExplorers: {
    default: { name: 'Snowtrace Testnet', url: 'https://testnet.snowtrace.io' },
  },
  testnet: true,
} as const;

export type SupportedChainId =
  | typeof CHAIN_IDS.BASE_SEPOLIA
  | typeof CHAIN_IDS.BASE_MAINNET
  | typeof CHAIN_IDS.ARC_TESTNET
  | typeof CHAIN_IDS.AVALANCHE_FUJI;

function getViemChain(chainId: number) {
  if (chainId === CHAIN_IDS.BASE_SEPOLIA) return baseSepolia;
  if (chainId === CHAIN_IDS.BASE_MAINNET) return base;
  if (chainId === CHAIN_IDS.ARC_TESTNET) return arcTestnet;
  if (chainId === CHAIN_IDS.AVALANCHE_FUJI) return avalancheFuji;
  throw new Error(
    `Unsupported chain ID: ${chainId}. Currently supported: Base Sepolia (${CHAIN_IDS.BASE_SEPOLIA}), Base Mainnet (${CHAIN_IDS.BASE_MAINNET}), Arc Testnet (${CHAIN_IDS.ARC_TESTNET}), Avalanche Fuji (${CHAIN_IDS.AVALANCHE_FUJI}).`,
  );
}

// ---- Transport factories (initialized once per session) ----

let _passkeyTransport: Transport | null = null;
const _modularTransportCache: Map<string, Transport> = new Map();
let _clientUrl = '';
let _clientKey = '';

/**
 * Initialize Circle SDK configuration.
 * Call once on app startup with credentials from Circle Console.
 * In Next.js, pass NEXT_PUBLIC_CIRCLE_CLIENT_KEY and NEXT_PUBLIC_CIRCLE_CLIENT_URL.
 */
export function initSignetCircle(clientUrl: string, clientKey: string): void {
  _clientUrl = clientUrl;
  _clientKey = clientKey;
}

function ensureInit(): { clientUrl: string; clientKey: string } {
  if (!_clientUrl || !_clientKey) {
    throw new Error(
      'Circle SDK not initialized. Call initSignetCircle(clientUrl, clientKey) first.',
    );
  }
  return { clientUrl: _clientUrl, clientKey: _clientKey };
}

function getPasskeyTransport(): Transport {
  if (!_passkeyTransport) {
    const { clientUrl, clientKey } = ensureInit();
    _passkeyTransport = toPasskeyTransport(clientUrl, clientKey);
  }
  return _passkeyTransport;
}

function getModularTransport(chainPath: string): Transport {
  const { clientUrl, clientKey } = ensureInit();
  const fullUrl = `${clientUrl}${chainPath}`;
  if (!_modularTransportCache.has(fullUrl)) {
    _modularTransportCache.set(fullUrl, toModularTransport(fullUrl, clientKey));
  }
  return _modularTransportCache.get(fullUrl)!;
}

// ---- Re-exported types for consumers ----

export type { P256Credential, SmartAccount, WebAuthnAccount };
export { WebAuthnMode, toWebAuthnCredential, toWebAuthnAccount };

/**
 * Register a new passkey credential.
 * Prompts the user to create a passkey via WebAuthn (fingerprint / face / device PIN).
 * Returns a P256Credential that should be persisted (httpOnly cookie in production).
 */
export async function registerPasskey(username: string): Promise<P256Credential> {
  const credential = await toWebAuthnCredential({
    transport: getPasskeyTransport(),
    mode: WebAuthnMode.Register,
    username,
  });
  return credential;
}

/**
 * Login with an existing passkey.
 * Prompts the user to authenticate with their passkey via WebAuthn.
 * Returns a P256Credential that should be persisted.
 */
export async function loginWithPasskey(): Promise<P256Credential> {
  const credential = await toWebAuthnCredential({
    transport: getPasskeyTransport(),
    mode: WebAuthnMode.Login,
  });
  return credential;
}

/**
 * Create a Circle Smart Account (MSCA) from a passkey credential.
 *
 * @param chainId - EVM chain ID (84532 = Base Sepolia, 5042002 = Arc Testnet)
 * @param modularWalletPath - Chain path segment (e.g., '/baseSepolia', '/arcTestnet')
 * @param credential - P256Credential from registerPasskey or loginWithPasskey
 * @param accountName - Optional human-readable name for the account
 */
export async function createSmartAccount(
  chainId: SupportedChainId,
  modularWalletPath: string,
  credential: P256Credential,
  accountName?: string,
): Promise<SmartAccount> {
  const transport = getModularTransport(modularWalletPath);
  const chain = getViemChain(chainId);

  const client = createPublicClient({
    chain,
    transport,
  });

  const account = await toCircleSmartAccount({
    client,
    owner: toWebAuthnAccount({ credential }) as WebAuthnAccount,
    name: accountName,
  });

  return account;
}

/**
 * Create a bundler client for sending user operations (gasless transactions).
 * Works on both Base Sepolia and Arc Testnet.
 */
export function createSignetBundlerClient(chainId: SupportedChainId, modularWalletPath: string) {
  const chain = getViemChain(chainId);
  const transport = getModularTransport(modularWalletPath);

  return createBundlerClient({
    chain,
    transport,
  });
}

/**
 * Send a user operation (gasless via Gas Station paymaster).
 *
 * This is the generic entry point for all on-chain actions through Circle's bundler:
 * - EAS schema registration
 * - EAS attestation
 * - Any contract call that the smart account must execute
 *
 * @param chainId - EVM chain ID
 * @param modularWalletPath - Chain path segment (e.g., '/baseSepolia', '/arcTestnet')
 * @param account - The Circle Smart Account
 * @param calls - Array of { to, data, value } call data objects
 * @returns Transaction hash
 */
export async function sendUserOp(
  chainId: SupportedChainId,
  modularWalletPath: string,
  account: SmartAccount,
  calls: { to: `0x${string}`; data: `0x${string}`; value: bigint }[],
): Promise<`0x${string}`> {
  const bundlerClient = createSignetBundlerClient(chainId, modularWalletPath);

  // sendUserOperation supports paymaster: true for gasless (Gas Station)
  // The call is sent as a batch — single call array works fine
  const userOpHash = await bundlerClient.sendUserOperation({
    account,
    calls,
    paymaster: true,
  });

  return userOpHash;
}

/**
 * Get the smart account address.
 */
export function getAccountAddress(account: SmartAccount): `0x${string}` {
  return account.address;
}

/**
 * Serialize a P256Credential for persistence.
 * WARNING: In production, store in httpOnly cookies — never localStorage.
 */
export function serializeCredential(credential: P256Credential): string {
  return JSON.stringify(credential);
}

/**
 * Deserialize a persisted P256Credential from storage.
 */
export function deserializeCredential(serialized: string): P256Credential {
  return JSON.parse(serialized) as P256Credential;
}
