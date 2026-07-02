import { SUPPORTED_CHAINS } from './types/chains.js';

export { SUPPORTED_CHAINS };

export const EAS_CONTRACT_ADDRESS: Record<number, string> = {};

for (const chain of SUPPORTED_CHAINS) {
  if (chain.easContractAddress) {
    EAS_CONTRACT_ADDRESS[chain.chainId] = chain.easContractAddress;
  }
}

export const SIGNET_EAS_SCHEMA =
  'bytes32 contentHash, string title, address signer, uint256 signedAt, uint8 privacyMode, uint8 signingMethod, bytes32 supplementaryProof';

export const CIRCLE_MODULAR_WALLET_BASE_URL = 'https://api.circle.com';

export const CHAIN_IDS = {
  BASE_SEPOLIA: 84532,
  ARC_TESTNET: 5042002,
  BASE_MAINNET: 8453,
  AVALANCHE_C_CHAIN: 43114,
  AVALANCHE_FUJI: 43113,
} as const;

export const SIGNING_METHODS = {
  PASSKEY: 0,
  SWIPE: 1,
  STYLUS: 2,
  WALLET_CONNECT: 3,
} as const;

export const PRIVACY_MODES = {
  PUBLIC: 0,
  SEMI_PRIVATE: 1,
  FULLY_PRIVATE: 2,
} as const;
