// Cross-Chain Attestation Bridge
//
// Chain-agnostic attestation helper. Add any chain by importing its
// attestation writer. Currently supports: casper, avalanche.
//
// Architecture:
//   x402 operation → chain-specific attestation → txHash
//   txHash → EAS on Base → verifiable on 12+ EVM chains

import crypto from 'node:crypto';

function sha256(data: string): string {
  return `0x${crypto.createHash('sha256').update(data).digest('hex')}`;
}

export type AttestationChain = 'casper' | 'avalanche';

interface AttestationParams {
  chain: AttestationChain;
  operation: string;
  amount: number;
  witnessId: string;
  event?: string;
  evidenceHash?: string;
  payload: Record<string, unknown>;
}

/**
 * Fire chain-agnostic attestation. Non-blocking.
 * To add a new chain: add it to AttestationChain union + import below.
 */
export function fireChainAttestation(params: AttestationParams) {
  const { chain, operation, amount, witnessId, event, evidenceHash, payload } = params;

  void (async () => {
    try {
      let txHash: string | undefined;

      if (chain === 'casper') {
        const { writeAttestation } = await import('./attest-to-casper');
        const result = await writeAttestation({
          agent_id: 'sigil-v1', operation, amount: String(amount),
          platform_tx: sha256(`${witnessId}:${event || ''}:${evidenceHash || ''}:${Date.now()}`),
          timestamp: Math.floor(Date.now() / 1000),
          proof_hash: sha256(JSON.stringify(payload)),
        });
        if (result.success) txHash = result.transactionHash;
      } else if (chain === 'avalanche') {
        const { writeAttestation } = await import('./attest-to-avalanche');
        const result = await writeAttestation({
          agent_id: 'sigil-v1', operation, amount: String(amount),
          platform_tx: sha256(`${witnessId}:${event || ''}:${evidenceHash || ''}:${Date.now()}`),
          timestamp: Math.floor(Date.now() / 1000),
          proof_hash: sha256(JSON.stringify(payload)),
        });
        if (result.success) txHash = result.transactionHash;
      }

      if (txHash) {
        console.log(`[cross-chain] ${chain} ${operation} attested: ${txHash}`);
        console.log(`[cross-chain] → Bridge to EAS: POST /api/attest with chainTxHash=${txHash}`);
      }
    } catch (err) {
      console.warn(`[cross-chain] ${chain} attestation skipped: ${err instanceof Error ? err.message : String(err)}`);
    }
  })();
}

// Backward-compatible alias for existing callers
export const fireCasperAttestation = (params: Omit<AttestationParams, 'chain'>) =>
  fireChainAttestation({ ...params, chain: 'casper' });
