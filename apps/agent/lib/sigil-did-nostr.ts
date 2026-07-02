// 🦅 did:nostr Identity for Sigil
//
// Serves Sigil's W3C Decentralized Identifier document at
// /.well-known/did/nostr/<pubkey>.json
//
// Other agents (Luna, enterprise agents, etc.) resolve this to discover:
//   - Sigil's Casper Ed25519 public key (verification)
//   - Sigil's x402 service endpoints
//   - Cross-chain identity (Casper key → Base EVM address)
//   - Linked agents (alsoKnownAs)
//
// Early adopter of did:nostr spec v0.1.0 (W3C Nostr CG, Jun 30 2026)
// https://github.com/nostrcg/did-nostr

import { CASPER_NETWORK } from '@/lib/x402-casper-adapter';
import { SERVICE_INFO } from '@/app/api/x402/service-info/route';

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const SIGIL_CASPER_WALLET = process.env.SIGIL_CASPER_WALLET_ADDRESS || '';
const SIGNET_AGENT_WALLET = process.env.SIGNET_AGENT_WALLET_ADDRESS || '';
const SIGIL_BASE_URL = process.env.SIGIL_BASE_URL || 'https://signet.ventures';
const LUNA_DID_NOSTR = process.env.LUNA_DID_NOSTR || '';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DidNostrDocument {
  '@context': string[];
  id: string;
  type: string;
  alsoKnownAs?: string[];
  verificationMethod: Array<{
    id: string;
    type: string;
    controller: string;
    publicKeyMultibase?: string;
    blockchainAccountId?: string;
  }>;
  authentication: string[];
  assertionMethod: string[];
  service?: Array<{
    id: string;
    type: string;
    serviceEndpoint: string | string[];
    description?: string;
  }>;
  profile?: Record<string, unknown>;
  follows?: string[];
  modified: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Strip 00/01 prefix from Casper address to get the raw 64-char pubkey */
function walletToPubkey(wallet: string): string {
  return wallet.replace(/^0x/i, '').replace(/^(00|01)/, '');
}

/** Encode Ed25519 key as multibase (base16-lower + multicodec prefix) */
function encodeEd25519Multibase(hexPubkey: string): string {
  const cleaned = hexPubkey.replace(/^0x/i, '');
  const codecPrefix = new Uint8Array([0xed, 0x01]);
  const keyBytes = new Uint8Array(cleaned.length / 2);
  for (let i = 0; i < keyBytes.length; i++) {
    keyBytes[i] = Number.parseInt(cleaned.substr(i * 2, 2), 16);
  }
  const combined = new Uint8Array(codecPrefix.length + keyBytes.length);
  combined.set(codecPrefix);
  combined.set(keyBytes, codecPrefix.length);
  return `f${Array.from(combined).map((b) => b.toString(16).padStart(2, '0')).join('')}`;
}

// ---------------------------------------------------------------------------
// DID Document Builder
// ---------------------------------------------------------------------------

export function buildSigilDidDocument(casperPubkey: string): DidNostrDocument {
  const did = `did:nostr:${casperPubkey.toLowerCase()}`;
  const now = new Date().toISOString();

  const operations = SERVICE_INFO.operations || {};
  const serviceEndpoints = Object.entries(operations).map(([name, op]: [string, { price?: number; description?: string }]) => ({
    id: `${did}#x402-${name}`,
    type: 'x402Service',
    serviceEndpoint: `${SIGIL_BASE_URL}/api/x402/${name}`,
    description: op.description || `${name} operation — $${op.price || 0} USDC`,
  }));

  const doc: DidNostrDocument = {
    '@context': ['https://www.w3.org/ns/did/v1', 'https://w3id.org/nostr/context'],
    id: did,
    type: 'DIDNostr',
    alsoKnownAs: [],
    verificationMethod: [
      {
        id: `${did}#key1`,
        type: 'Ed25519VerificationKey2020',
        controller: did,
        publicKeyMultibase: encodeEd25519Multibase(casperPubkey),
        blockchainAccountId: `casper:${SIGIL_CASPER_WALLET || 'unknown'}`,
      },
    ],
    authentication: ['#key1'],
    assertionMethod: ['#key1'],
    service: [
      {
        id: `${did}#x402-discovery`,
        type: 'x402Service',
        serviceEndpoint: `${SIGIL_BASE_URL}/api/x402/service-info`,
        description: 'Sigil x402 service discovery — all 10 operations and pricing',
      },
      {
        id: `${did}#agent-status`,
        type: 'AgentStatus',
        serviceEndpoint: `${SIGIL_BASE_URL}/api/agent/status`,
        description: 'Sigil real-time agent status',
      },
      {
        id: `${did}#cross-chain-identity`,
        type: 'CrossChainIdentity',
        serviceEndpoint: `${SIGIL_BASE_URL}/api/agent/identity`,
        description: 'Sigil cross-chain identity — Casper Ed25519 → Base EVM',
      },
      ...serviceEndpoints,
    ],
    profile: {
      name: 'Sigil',
      about: 'Legal clarity agent — witness, escrow, dispute, compliance. Multi-chain attestation on Casper, Base, Arc, and Avalanche.',
      agentVersion: '1.0.0',
      network: CASPER_NETWORK,
      evmAddress: SIGNET_AGENT_WALLET,
      operations: Object.entries(operations).map(([name, op]: [string, { price?: number }]) => ({
        name,
        priceUSDC: op.price || 0,
      })),
    },
    follows: [],
    modified: now,
  };

  if (LUNA_DID_NOSTR) {
    doc.alsoKnownAs!.push(LUNA_DID_NOSTR);
    doc.follows!.push(LUNA_DID_NOSTR);
  }
  if (SIGNET_AGENT_WALLET && SIGNET_AGENT_WALLET !== '0x0000000000000000000000000000000000000000') {
    doc.alsoKnownAs!.push(`eip155:84532:${SIGNET_AGENT_WALLET}`);
  }

  return doc;
}

export function buildMinimalDidDocument(pubkey: string): DidNostrDocument {
  const did = `did:nostr:${pubkey.toLowerCase()}`;
  return {
    '@context': ['https://www.w3.org/ns/did/v1', 'https://w3id.org/nostr/context'],
    id: did,
    type: 'DIDNostr',
    verificationMethod: [
      {
        id: `${did}#key1`,
        type: 'Ed25519VerificationKey2020',
        controller: did,
        publicKeyMultibase: encodeEd25519Multibase(pubkey),
      },
    ],
    authentication: ['#key1'],
    assertionMethod: ['#key1'],
    modified: new Date().toISOString(),
  };
}
