// ERC-8021 Builder Code DataSuffix Helper
//
// Appends a Base Builder Code as an ERC-8021 Schema 2 dataSuffix to transaction
// calldata. This enables onchain attribution of Signet's transactions on Base.
//
// Registered via: POST https://api.base.dev/v1/agents/builder-codes
// Wallet: 0x3b4EcE4CdE860e0A9076f70483Db3e4209CC1175
// Builder Code: bc_2jqg6gik
//
// ERC-8021 Schema 2 format:
//   [original calldata] [CBOR-encoded map of a/s/w] [2-byte CBOR length] [0x02 schema ID] [16-byte marker]
//
// For proper ERC-8021 encoding, use the attribution module:
//   import { DATA_SUFFIX, getAttributionDataSuffix } from './attribution.js';
//
// The x402 payment layer (Track 1) handles attribution inside x402 settlements.
// This module is for non-x402 transactions — EAS attestations, contract calls,
// and any other onchain actions the agent takes that should be attributed to Signet.
//
// This is the SELLER code (Signet is the service provider).
// In parsed attribution: { a: "bc_2jqg6gik", w: "cdp_facil", s: "buyer_code" }

import { DATA_SUFFIX, SIGIL_BUILDER_CODE } from './attribution.js';

/**
 * Get the builder code string for Base attribution.
 * @returns The builder code string
 */
export function getBuilderCodeSuffix(): string {
  return SIGIL_BUILDER_CODE;
}

/**
 * Append the proper ERC-8021 dataSuffix to transaction calldata.
 * Uses the ox-encoded suffix from attribution.ts.
 *
 * @param calldata - Original transaction calldata (hex-encoded)
 * @returns Calldata with ERC-8021 dataSuffix appended
 */
export function appendBuilderCodeSuffix(calldata: string): string {
  if (!DATA_SUFFIX) return calldata;
  return calldata + DATA_SUFFIX.slice(2);
}

/**
 * Check if a builder code is registered.
 */
export function hasBuilderCode(): boolean {
  return getBuilderCodeSuffix().length > 0;
}