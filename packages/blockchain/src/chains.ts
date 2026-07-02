import { SUPPORTED_CHAINS } from '@signet/shared';
import type { ChainConfig } from '@signet/shared';

export { SUPPORTED_CHAINS };

export function getChainConfig(chainId: number): ChainConfig | undefined {
  return SUPPORTED_CHAINS.find((c) => c.chainId === chainId);
}

export function getExplorerUrl(chainId: number, txHash: string): string {
  const chain = getChainConfig(chainId);
  if (!chain) return '';
  return `${chain.explorerUrl}/tx/${txHash}`;
}

export function getExplorerAttestationUrl(
  chainId: number,
  attestationUid: string,
): string {
  const chain = getChainConfig(chainId);
  if (!chain) return '';
  // BaseScan supports attestation lookup via EAS explorer integration
  return `${chain.explorerUrl}/tx/${attestationUid}`;
}

export const ACTIVE_CHAINS = {
  BASE_SEPOLIA: SUPPORTED_CHAINS[0]!,
  ARC_TESTNET: SUPPORTED_CHAINS[1]!,
  BASE_MAINNET: SUPPORTED_CHAINS[2]!,
  AVALANCHE: SUPPORTED_CHAINS[3]!,
};