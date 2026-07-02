// Hex utility for Ed25519 signature verification
//
// Used by x402-payment.ts to convert hex-encoded public keys and signatures
// to Uint8Array for tweetnacl Ed25519 verification.
//
// Zero dependencies. Pure function. ~1KB.

/**
 * Decode a hex string to Uint8Array.
 * Accepts "0x"-prefixed or raw hex. Case-insensitive.
 */
export function decodeHex(hex: string): Uint8Array {
  const stripped = hex.startsWith('0x') ? hex.slice(2) : hex;
  if (stripped.length % 2 !== 0) {
    throw new Error(`Invalid hex length: ${stripped.length}`);
  }
  const bytes = new Uint8Array(stripped.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    const byte = stripped.substring(i * 2, i * 2 + 2);
    bytes[i] = parseInt(byte, 16);
  }
  return bytes;
}
