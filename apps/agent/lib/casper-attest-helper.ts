// Cross-Chain Attestation Helper
//
// After every Casper x402 operation, fires an on-chain attestation
// on the AgentAttest contract (Casper Testnet).
//
// The returned Casper transaction hash can optionally be bridged to
// EAS on Base Sepolia via attestOnChain() — making the Casper operation
// verifiable on any EVM chain where EAS is deployed.
//
// Architecture:
//   Casper operation → AgentAttest.record() → casperTxHash
//                                                   ↓
//   casperTxHash → EAS attestOnChain(Base) → baseAttestationUid
//                                                   ↓
//                                     Verifiable on 12+ EVM chains

import crypto from 'node:crypto';

function sha256(data: string): string {
  return `0x${crypto.createHash('sha256').update(data).digest('hex')}`;
}

/**
 * Fire Casper attestation and optionally cross-chain bridge to EAS.
 * Non-blocking — errors are logged but never thrown.
 */
export function fireCasperAttestation(params: {
  operation: string;
  amount: number;
  witnessId: string;
  event?: string;
  evidenceHash?: string;
  payload: Record<string, unknown>;
}) {
  const { operation, amount, witnessId, event, evidenceHash, payload } = params;

  // Fire-and-forget — never block the HTTP response
  void (async () => {
    // Chain 1: Casper AgentAttest
    try {
      const { writeAttestation } = await import('./attest-to-casper');
      const result = await writeAttestation({
        agent_id: 'sigil-v1',
        operation,
        amount: String(amount),
        platform_tx: sha256(
          `${witnessId}:${event || ''}:${evidenceHash || ''}:${Date.now()}`,
        ),
        timestamp: Math.floor(Date.now() / 1000),
        proof_hash: sha256(JSON.stringify(payload)),
      });

      if (result.success && result.transactionHash) {
        console.log(
          `[cross-chain] Casper ${operation} attested: ${result.transactionHash}`,
        );
        console.log(
          `[cross-chain] → Bridge to EAS: POST /api/attest with casperTxHash=${result.transactionHash}`,
        );
      }
    } catch (err) {
      console.warn(
        `[cross-chain] Casper attestation skipped: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  })();
}
