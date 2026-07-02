/**
 * GET /api/agent/identity
 *
 * Returns Sigil's cross-chain identity — cryptographic proof that
 * the Casper Ed25519 key controls the Base EVM address.
 *
 * Other agents call this to verify: "Is this Casper agent the real Sigil?"
 *
 * The identity is signed by Sigil's Casper secret key and contains:
 *   - Casper Ed25519 public key
 *   - Base EVM address
 *   - A signed statement linking them
 *   - Verifying agents check the Ed25519 signature locally
 */

import { NextResponse } from 'next/server';
import { decodeHex } from '@/lib/hex-utils';
import { createCrossChainIdentity, verifyCrossChainIdentity } from '@/lib/cross-chain-identity';
import type { CrossChainIdentity } from '@/lib/cross-chain-identity';

const SIGIL_CASPER_WALLET = process.env.SIGIL_CASPER_WALLET_ADDRESS || '';
const CASPER_AGENT_SECRET_KEY = process.env.CASPER_AGENT_SECRET_KEY || '';
const SIGNET_AGENT_WALLET = process.env.SIGNET_AGENT_WALLET_ADDRESS || '';

/** In-memory cache — identity only changes if key rotates */
let cachedIdentity: CrossChainIdentity | null = null;

function buildIdentity(): CrossChainIdentity | null {
  if (!CASPER_AGENT_SECRET_KEY || !SIGNET_AGENT_WALLET) {
    return null;
  }

  // Secret key is hex — decode and use as Ed25519 keypair
  // tweetnacl expects 64-byte (seed+pubkey) or 32-byte (seed only)
  try {
    const keyBytes = decodeHex(CASPER_AGENT_SECRET_KEY.replace(/^0x/i, ''));
    if (keyBytes.length < 32) return null;
    // If 32 bytes, treat as seed; if 64+, use full secret key
    const secretKey = keyBytes.length === 32
      ? new Uint8Array([...keyBytes, ...new Uint8Array(32)])
      : keyBytes.slice(0, 64);

    return createCrossChainIdentity(secretKey, SIGNET_AGENT_WALLET, 'base-sepolia');
  } catch {
    return null;
  }
}

export async function GET() {
  if (!cachedIdentity) {
    cachedIdentity = buildIdentity();
  }

  if (!cachedIdentity) {
    return NextResponse.json(
      {
        error: 'Identity not configured',
        details: 'Set SIGIL_CASPER_WALLET_ADDRESS, SIGNET_AGENT_WALLET_ADDRESS, and CASPER_AGENT_SECRET_KEY to enable cross-chain identity.',
      },
      { status: 503, headers: { 'Access-Control-Allow-Origin': '*' } },
    );
  }

  return NextResponse.json(cachedIdentity, {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=3600',
      'Access-Control-Allow-Origin': '*',
      'X-Identity-Scheme': 'ed25519-cross-chain',
    },
  });
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as CrossChainIdentity;
    const result = verifyCrossChainIdentity(body);

    return NextResponse.json(result, {
      status: result.verified ? 200 : 400,
      headers: { 'Access-Control-Allow-Origin': '*' },
    });
  } catch {
    return NextResponse.json(
      { verified: false, errors: ['Invalid request body — expected CrossChainIdentity JSON'] },
      { status: 400, headers: { 'Access-Control-Allow-Origin': '*' } },
    );
  }
}
