// 🦅 Sigil Cross-Chain Identity
//
// Cryptographic link between Sigil's Casper Ed25519 identity and
// her Base EVM address. Proves both keys belong to the same agent.
//
// Casper uses Ed25519 keys. Base uses ECDSA/secp256k1.
// Different curves, no shared key. This module proves control of both:
//
//   1. Sigil's Casper key signs a statement:
//      "I, [CasperPubKey], control EVM address [0x...] on Base Sepolia"
//
//   2. The signed statement is served at GET /api/agent/identity
//
//   3. Verifying agents:
//      a. Read the attestation from Sigil's endpoint
//      b. Verify the Ed25519 signature (proves Casper key signed it)
//      c. Check that the EVM address matches Sigil's ERC-8004 or wallet
//      d. If both match → "This Casper agent IS the real Sigil"

import nacl from 'tweetnacl';
import { decodeHex, encodeHex } from '@/lib/hex-utils';

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const SIGIL_CASPER_WALLET = process.env.SIGIL_CASPER_WALLET_ADDRESS || '';
const SIGNET_AGENT_WALLET = process.env.SIGNET_AGENT_WALLET_ADDRESS || '';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CrossChainIdentity {
  /** Casper public key (Ed25519 hex) */
  casperPublicKey: string;
  /** EVM address on Base */
  evmAddress: string;
  /** Base chain identifier */
  evmChain: string;
  /** Human-readable identity statement */
  statement: string;
  /** Ed25519 signature of the statement, signed by Casper private key */
  signature: string;
  /** Timestamp */
  createdAt: string;
}

export interface IdentityVerificationResult {
  verified: boolean;
  identity?: CrossChainIdentity;
  errors: string[];
}

// ---------------------------------------------------------------------------
// Attestation Builder
// ---------------------------------------------------------------------------

const DEFAULT_STATEMENT =
  'This Casper agent controls the following EVM address on Base. '
  + 'Verify this signature against the Casper public key, then check '
  + 'the EVM address matches the agent wallet.';

function buildStatement(casperPubKey: string, evmAddress: string, evmChain: string): string {
  return [
    `Casper Agent: ${casperPubKey}`,
    `Controls EVM Address: ${evmAddress}`,
    `Chain: ${evmChain}`,
    `Statement: ${DEFAULT_STATEMENT}`,
  ].join('\n');
}

// ---------------------------------------------------------------------------
// Signing
// ---------------------------------------------------------------------------

/**
 * Create Sigil's cross-chain identity by signing a statement with the
 * Casper Ed25519 secret key that links to the Base EVM address.
 *
 * @param casperSecretKey - Ed25519 secret key (64 bytes hex, or Uint8Array)
 * @param evmAddress - Sigil's EVM address on Base
 * @param evmChain - Chain name
 */
export function createCrossChainIdentity(
  casperSecretKey: Uint8Array,
  evmAddress: string = SIGNET_AGENT_WALLET,
  evmChain: string = 'base-sepolia',
): CrossChainIdentity {
  const keyPair = nacl.sign.keyPair.fromSecretKey(casperSecretKey);
  const casperPublicKey = encodeHex(keyPair.publicKey);

  const statement = buildStatement(casperPublicKey, evmAddress, evmChain);
  const message = new TextEncoder().encode(statement);
  const signature = nacl.sign.detached(message, casperSecretKey);

  return {
    casperPublicKey,
    evmAddress,
    evmChain,
    statement,
    signature: encodeHex(signature),
    createdAt: new Date().toISOString(),
  };
}

// ---------------------------------------------------------------------------
// Verification
// ---------------------------------------------------------------------------

/**
 * Verify a cross-chain identity attestation.
 * Any agent can call this to confirm that "Sigil on Casper"
 * is the same entity as "Sigil on Base."
 */
export function verifyCrossChainIdentity(
  identity: CrossChainIdentity,
): IdentityVerificationResult {
  const errors: string[] = [];

  if (!identity.casperPublicKey || identity.casperPublicKey.length < 64) {
    errors.push('Invalid casperPublicKey');
  }
  if (!identity.evmAddress || !identity.evmAddress.startsWith('0x') || identity.evmAddress.length !== 42) {
    errors.push('Invalid evmAddress');
  }
  if (!identity.signature || identity.signature.length < 128) {
    errors.push('Invalid or missing signature');
  }
  if (!identity.statement) {
    errors.push('Missing identity statement');
  }

  if (errors.length > 0) {
    return { verified: false, identity, errors };
  }

  const expectedStatement = buildStatement(
    identity.casperPublicKey,
    identity.evmAddress,
    identity.evmChain,
  );

  if (identity.statement !== expectedStatement) {
    errors.push('Statement does not match expected format');
    return { verified: false, identity, errors };
  }

  try {
    const message = new TextEncoder().encode(identity.statement);
    const sig = decodeHex(identity.signature);
    const pub = decodeHex(identity.casperPublicKey);

    const isValid = nacl.sign.detached.verify(message, sig, pub);
    if (!isValid) {
      errors.push('Signature does not match Casper public key');
    }

    return { verified: errors.length === 0, identity, errors };
  } catch (err) {
    errors.push(`Signature verification error: ${err instanceof Error ? err.message : String(err)}`);
    return { verified: false, identity, errors };
  }
}
