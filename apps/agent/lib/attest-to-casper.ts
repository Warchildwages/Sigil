// Casper AgentAttest Integration for Sigil
//
// Writes attestation records to the AgentAttest Odra contract on Casper Testnet
// after Sigil completes a paid operation (witness, escrow, dispute, timestamp,
// compliance, etc.).
//
// AgentAttest contract (Odra/Rust): casper/AgentAttest/src/main.rs
//
// Dependencies: casper-js-sdk

import { CASPER_NETWORK, SIGIL_CASPER_WALLET } from './x402-casper-adapter';

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

/** AgentAttest contract hash on Casper Testnet (set after odra deploy) */
export const AGENT_ATTEST_CONTRACT_HASH =
  process.env.AGENT_ATTEST_CONTRACT_HASH || '';

/** Casper node RPC endpoint */
export const CASPER_RPC_URL =
  process.env.CASPER_RPC_URL || 'https://rpc.testnet.casper.network';

/** Secret key for the Sigil agent wallet on Casper (PEM file path or hex) */
export const CASPER_AGENT_KEY =
  process.env.CASPER_AGENT_SECRET_KEY || '';

/** Whether Casper attestation is configured */
export const CASPER_ATTEST_CONFIGURED =
  Boolean(AGENT_ATTEST_CONTRACT_HASH) && Boolean(CASPER_AGENT_KEY);

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AttestationRecord {
  agent_id: string;
  operation: string;
  amount: string;
  platform_tx: string;
  timestamp: number;
  proof_hash: string;
  requested_by?: string;
}

export interface AttestationResult {
  success: boolean;
  transactionHash?: string;
  error?: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Dynamic import wrapper — casper-js-sdk v5 cjs exposes classes via .default */
async function loadCasperSdk(): Promise<Record<string, any>> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mod: any = await import('casper-js-sdk');
  return (mod.default && Object.keys(mod.default).length > 3) ? mod.default : mod;
}

// ---------------------------------------------------------------------------
// Attestation Writer
// ---------------------------------------------------------------------------

/**
 * Write an attestation to the AgentAttest contract on Casper.
 *
 * Constructs a Casper deploy that calls AgentAttest.record() with the
 * attestation data, signs it with the Sigil agent wallet, and submits
 * to the Casper Testnet.
 */
export async function writeAttestation(
  record: AttestationRecord,
): Promise<AttestationResult> {
  if (!CASPER_ATTEST_CONFIGURED) {
    console.warn(
      '[attest-to-casper] AGENT_ATTEST_CONTRACT_HASH or CASPER_AGENT_SECRET_KEY not set',
    );
    return { success: false, error: 'CONTRACT_OR_WALLET_NOT_CONFIGURED' };
  }

  try {
    const cs = await loadCasperSdk();
    const { CasperClient, Contracts, RuntimeArgs, DeployUtil, Keys } = cs;

    const casperClient = new CasperClient(CASPER_RPC_URL);

    // Load the agent wallet key (PEM file or direct hex)
    const keyPair =
      CASPER_AGENT_KEY.startsWith('-----BEGIN') ||
      CASPER_AGENT_KEY.includes('PRIVATE KEY')
        ? Keys.Ed25519.loadKeyPairFromPrivateFile(CASPER_AGENT_KEY)
        : Keys.Ed25519.parseKeyPair(
            Keys.Ed25519.newPublicKey(
              process.env.CASPER_AGENT_PUBLIC_KEY || '',
            ),
            CASPER_AGENT_KEY,
          );

    // Build the contract call deploy
    const deploy = DeployUtil.makeDeploy(
      new DeployUtil.DeployParams(
        keyPair.publicKey,
        CASPER_NETWORK.replace('casper:', ''),
        1,
        1_800_000, // 30 min TTL
      ),
      DeployUtil.ExecutableDeployItem.newStoredContractByHash(
        Uint8Array.from(Buffer.from(AGENT_ATTEST_CONTRACT_HASH, 'hex')),
        'record',
        RuntimeArgs.fromMap({
          agent_id: Contracts.stringToCLValue(record.agent_id),
          operation: Contracts.stringToCLValue(record.operation),
          amount: Contracts.stringToCLValue(record.amount),
          platform_tx: Contracts.stringToCLValue(record.platform_tx),
          timestamp: Contracts.u64ToCLValue(record.timestamp),
          proof_hash: Contracts.stringToCLValue(record.proof_hash),
          requested_by: record.requested_by
            ? Contracts.stringToCLValue(record.requested_by)
            : Contracts.optionToCLValue(null),
        }),
      ),
      DeployUtil.getStandardPayment(1_500_000_000), // 1.5 CSPR gas
    );

    // Sign and submit
    const signedDeploy = DeployUtil.signDeploy(deploy, keyPair);
    const deployHash = await casperClient.putDeploy(signedDeploy);

    console.log(
      `[attest-to-casper] ${record.operation} attestation submitted: ${deployHash}`,
    );

    return {
      success: true,
      transactionHash: deployHash,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[attest-to-casper] Failed: ${message}`);
    return { success: false, error: message };
  }
}

/**
 * Query an existing attestation by platform transaction hash.
 */
export async function getAttestation(
  platformTx: string,
): Promise<AttestationRecord | null> {
  if (!CASPER_ATTEST_CONFIGURED) {
    return null;
  }

  try {
    const cs = await loadCasperSdk();
    const { CasperClient, Contracts } = cs;

    const casperClient = new CasperClient(CASPER_RPC_URL);
    // Query the contract's get_attestation entry point
    const result = await Contracts.Contract.callEntrypoint(
      casperClient,
      AGENT_ATTEST_CONTRACT_HASH,
      'get_attestation',
      Contracts.RuntimeArgs.fromMap({
        platform_tx: Contracts.stringToCLValue(platformTx),
      }),
      CASPER_RPC_URL,
    );

    if (!result) return null;

    // Casper returns a tuple-like structure; extract fields
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = result as any;
    return {
      agent_id: data?.agent_id || '',
      operation: data?.operation || '',
      amount: data?.amount || '',
      platform_tx: data?.platform_tx || platformTx,
      timestamp: Number(data?.timestamp) || 0,
      proof_hash: data?.proof_hash || '',
      requested_by: data?.requested_by || undefined,
    };
  } catch {
    return null;
  }
}

/**
 * Get the total attestation count for Sigil on Casper.
 */
export async function getAttestationCount(
  agentId: string = 'sigil-v1',
): Promise<number> {
  if (!CASPER_ATTEST_CONFIGURED) {
    return 0;
  }

  try {
    const cs = await loadCasperSdk();
    const { CasperClient, Contracts } = cs;

    const casperClient = new CasperClient(CASPER_RPC_URL);
    const result = await Contracts.Contract.callEntrypoint(
      casperClient,
      AGENT_ATTEST_CONTRACT_HASH,
      'agent_attestation_count',
      Contracts.RuntimeArgs.fromMap({
        agent_id: Contracts.stringToCLValue(agentId),
      }),
      CASPER_RPC_URL,
    );

    if (!result) return 0;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const count = (result as any)?.toString();
    return Number(count) || 0;
  } catch {
    return 0;
  }
}
