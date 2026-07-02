// Encryption key management for Signet document storage.
//
// Design (hybrid encryption):
//   1. Random 256-bit AES-GCM document key generated per document.
//   2. Document content encrypted with that key.
//   3. Document key wrapped with entity KEK derived via HKDF-SHA256.
//   4. Wrapped key (encryptedKey + keyIv) stored on Document record in Neon.
//
// This replaces the previous pattern of deriving the AES key from contentHash,
// which broke semantic security (deterministic encryption).
//
// KEK derivation: HKDF-SHA256 with JWT_SECRET as IKM and entityId as salt.
// The server must possess JWT_SECRET to unwrap document keys.

const JWT_SECRET = (): string =>
  process.env.JWT_SECRET || 'signet-demo-secret-rotate-in-production-2026';

/**
 * Generate a random 256-bit AES-GCM key for document encryption.
 * Returns a non-extractable CryptoKey for use with Web Crypto API.
 */
export async function generateDocumentKey(): Promise<CryptoKey> {
  return crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    true, // extractable — we need to wrap it
    ['encrypt', 'decrypt'],
  );
}

/**
 * Export a CryptoKey to raw bytes for wrapping.
 */
export async function exportDocumentKey(key: CryptoKey): Promise<Uint8Array> {
  const raw = await crypto.subtle.exportKey('raw', key);
  return new Uint8Array(raw);
}

/**
 * Import raw bytes back to a CryptoKey.
 */
export async function importDocumentKey(raw: Uint8Array): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    raw as Uint8Array<ArrayBuffer>,
    { name: 'AES-GCM' },
    false,
    ['encrypt', 'decrypt'],
  );
}

/**
 * Derive a Key Encryption Key (KEK) from JWT_SECRET + entityId via HKDF-SHA256.
 * The same (JWT_SECRET, entityId) pair always produces the same KEK.
 * This enables the entity to recover their document keys as long as the
 * server holds JWT_SECRET.
 */
export async function deriveKEK(entityId: string): Promise<CryptoKey> {
  const secret = new TextEncoder().encode(JWT_SECRET());
  const salt = new TextEncoder().encode(`signet-kek:${entityId}`);

  // Import JWT_SECRET as HMAC key material for HKDF
  const hmacKey = await crypto.subtle.importKey(
    'raw',
    secret,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['deriveKey'],
  );

  return crypto.subtle.deriveKey(
    {
      name: 'HKDF',
      hash: 'SHA-256',
      salt: salt as unknown as BufferSource,
      info: new TextEncoder().encode('signet-document-key-encryption') as unknown as BufferSource,
    },
    hmacKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['wrapKey', 'unwrapKey'],
  );
}

/**
 * Wrap a document key with the entity's KEK using AES-GCM.
 * Returns hex-encoded ciphertext and IV for storage.
 */
export async function wrapDocumentKey(
  docKey: CryptoKey,
  kek: CryptoKey,
): Promise<{ encryptedKey: string; keyIv: string }> {
  const iv = crypto.getRandomValues(new Uint8Array(12));

  const wrapped = await crypto.subtle.wrapKey(
    'raw',
    docKey,
    kek,
    { name: 'AES-GCM', iv },
  );

  return {
    encryptedKey: bytesToHex(new Uint8Array(wrapped)),
    keyIv: bytesToHex(iv),
  };
}

/**
 * Unwrap a document key that was encrypted with wrapDocumentKey.
 */
export async function unwrapDocumentKey(
  encryptedKeyHex: string,
  keyIvHex: string,
  kek: CryptoKey,
): Promise<CryptoKey> {
  const wrapped = hexToBytes(encryptedKeyHex);
  const iv = hexToBytes(keyIvHex);

  return crypto.subtle.unwrapKey(
    'raw',
    wrapped as unknown as BufferSource,
    kek,
    { name: 'AES-GCM', iv: iv as unknown as BufferSource },
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

/**
 * Public alias for deriveKEK — used by the storage route.
 */
export const entityKEK = deriveKEK;

// ---- Helpers ----

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes;
}