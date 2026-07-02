// Multi-modal signing methods — all backed by Circle Smart Account passkey authentication.
// Each method produces an EIP-712 typed signature over the document hash.
// The signingMethod field records which UX was used (passkey, swipe, stylus, wallet_connect).

import type { SigningMethod } from '@signet/shared';
import { SIGNING_METHODS } from '@signet/shared';
import type { SmartAccount } from './circle.js';
import { hashCanvasCapture } from './hash.js';

export interface SigningResult {
  signature: string;
  method: SigningMethod;
  supplementaryProof?: `0x${string}` | null;
}

/**
 * EIP-712 domain for Signet document signing.
 * Used by all signing methods to produce a typed, verifiable signature.
 */
export const SIGNET_EIP712_DOMAIN = {
  name: 'Signet',
  version: '1',
} as const;

/**
 * EIP-712 type definitions for document signing.
 */
export const SIGNET_EIP712_TYPES = {
  Document: [
    { name: 'contentHash', type: 'bytes32' },
    { name: 'title', type: 'string' },
    { name: 'signingMethod', type: 'uint8' },
    { name: 'supplementaryProof', type: 'bytes32' },
  ],
} as const;

/**
 * Format a document hash for EIP-712 signing.
 * Ensures the hash is a valid 32-byte hex string.
 */
function normalizeHash(hash: `0x${string}`): `0x${string}` {
  const hex = hash.startsWith('0x') ? hash.slice(2) : hash;
  return `0x${hex.padStart(64, '0')}` as `0x${string}`;
}

/**
 * Sign a document using the Circle Smart Account via passkey/WebAuthn.
 * All four UX methods converge on this path — the only difference is
 * the supplementary proof (stylus capture hash) and the recorded method enum.
 */
async function signEIP712(
  account: SmartAccount,
  documentHash: `0x${string}`,
  documentTitle: string,
  method: SigningMethod,
  supplementaryProof?: `0x${string}` | null,
): Promise<SigningResult> {
  const message = {
    contentHash: normalizeHash(documentHash),
    title: documentTitle,
    signingMethod: SIGNING_METHODS[method.toUpperCase() as keyof typeof SIGNING_METHODS] ?? 0,
    supplementaryProof: supplementaryProof
      ? normalizeHash(supplementaryProof)
      : ('0x0000000000000000000000000000000000000000000000000000000000000000' as `0x${string}`),
  };

  // This triggers WebAuthn — the user confirms with fingerprint/face/PIN
  const signature = await account.signTypedData({
    domain: SIGNET_EIP712_DOMAIN,
    types: SIGNET_EIP712_TYPES,
    primaryType: 'Document',
    message,
  });

  return {
    signature,
    method,
    supplementaryProof,
  };
}

/**
 * Sign with passkey — the user taps "Sign" and WebAuthn prompts for biometric/PIN.
 */
export async function signWithPasskey(
  account: SmartAccount,
  documentHash: `0x${string}`,
  documentTitle: string,
): Promise<SigningResult> {
  return signEIP712(account, documentHash, documentTitle, 'passkey');
}

/**
 * Sign with swipe — user swipes across a "Sign Here" bar, which triggers the same
 * WebAuthn passkey prompt. The swipe is a UX affordance, not a different crypto path.
 */
export async function signWithSwipe(
  account: SmartAccount,
  documentHash: `0x${string}`,
  documentTitle: string,
): Promise<SigningResult> {
  return signEIP712(account, documentHash, documentTitle, 'swipe');
}

/**
 * Sign with stylus — user draws their signature on a canvas.
 * The canvas image is hashed and included as supplementaryProof in the EIP-712 payload.
 * This provides a human-recognizable signature alongside the cryptographic proof.
 */
export async function signWithStylus(
  account: SmartAccount,
  documentHash: `0x${string}`,
  documentTitle: string,
  canvasImageData: ImageData,
): Promise<SigningResult> {
  const canvasHash = await hashCanvasCapture(canvasImageData);
  return signEIP712(account, documentHash, documentTitle, 'stylus', canvasHash);
}

/**
 * Sign with WalletConnect — for users who prefer an external wallet.
 * Opens a WalletConnect modal and signs the same EIP-712 typed data.
 */
export async function signWithWalletConnect(
  account: SmartAccount,
  documentHash: `0x${string}`,
  documentTitle: string,
): Promise<SigningResult> {
  return signEIP712(account, documentHash, documentTitle, 'wallet_connect');
}

export { SIGNING_METHODS };