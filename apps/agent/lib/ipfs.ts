// @ts-nocheck
// IPFS content storage via Pinata — AES-GCM encrypted before pinning
// Phase 2: client-side encryption (Web Crypto API). Phase 4: Arc ArcaneVM confidential storage.
// Uses Web Crypto API (available in Node.js 19+ and all browsers).
//
// Encryption key management is in encryption-keys.ts (hybrid: random doc key + KEK wrapping).

const PINATA_JWT = process.env.PINATA_JWT || '';

export interface PinResult {
  cid: string;
  gatewayUrl: string;
}

/**
 * Encrypt content with AES-GCM using an explicit encryption key.
 * The key should be a random 256-bit AES-GCM CryptoKey generated per document.
 */
async function encryptContent(
  content: Uint8Array,
  encryptionKey: CryptoKey,
): Promise<{ encrypted: Uint8Array; iv: string }> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    encryptionKey,
    content as unknown as BufferSource,
  );
  return {
    encrypted: new Uint8Array(ciphertext),
    iv: Array.from(iv).map((b) => b.toString(16).padStart(2, '0')).join(''),
  };
}

/**
 * Decrypt content retrieved from IPFS using an explicit encryption key.
 */
export async function decryptContent(
  encrypted: Uint8Array,
  ivHex: string,
  encryptionKey: CryptoKey,
): Promise<Uint8Array | null> {
  try {
    const iv = new Uint8Array(ivHex.match(/.{2}/g)!.map((b) => parseInt(b, 16)));
    const plaintext = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      encryptionKey,
      encrypted as unknown as BufferSource,
    );
    return new Uint8Array(plaintext);
  } catch {
    return null;
  }
}

/**
 * Convenience: decrypt content with an explicit key (same as decryptContent).
 */
export const decryptContentWithKey = decryptContent;

/**
 * Pin encrypted content to IPFS via Pinata.
 * Uses the provided CryptoKey for encryption (not derived from contentHash).
 * The contentHash is stored in Pinata metadata for integrity verification only.
 */
export async function pinToIPFS(
  content: Uint8Array,
  encryptionKey: CryptoKey,
  contentHash: string,
  fileName?: string,
): Promise<PinResult> {
  if (!PINATA_JWT) {
    throw new Error('PINATA_JWT not configured. Set PINATA_JWT in environment variables.');
  }

  const { encrypted, iv } = await encryptContent(content, encryptionKey);

  // Pinata requires file upload via multipart
  const fd = new FormData();
  // Convert Uint8Array to Blob for FormData compatibility
  const blob = new Blob([Buffer.from(encrypted)], { type: 'application/octet-stream' });
  fd.append('file', blob, fileName || 'document.bin');

  const metadata = JSON.stringify({
    name: fileName || 'Signet Document',
    keyvalues: {
      app: 'signet',
      contentHash,
      iv,
      encrypted: 'true',
    },
  });
  fd.append('pinataMetadata', metadata);
  fd.append('pinataOptions', JSON.stringify({ cidVersion: 1 }));

  const res = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
    method: 'POST',
    headers: { Authorization: `Bearer ${PINATA_JWT}` },
    body: fd,
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Pinata pin failed: ${res.status} ${err}`);
  }

  const data = await res.json() as { IpfsHash: string };
  return {
    cid: data.IpfsHash,
    gatewayUrl: `https://gateway.pinata.cloud/ipfs/${data.IpfsHash}`,
  };
}

/**
 * Retrieve content from IPFS via Pinata gateway.
 * Returns raw encrypted bytes.
 */
export async function retrieveFromIPFS(cid: string): Promise<Uint8Array> {
  const res = await fetch(`https://gateway.pinata.cloud/ipfs/${cid}`);
  if (!res.ok) {
    throw new Error(`IPFS retrieval failed: ${res.status}`);
  }
  const buf = await res.arrayBuffer();
  return new Uint8Array(buf);
}

/**
 * Store markdown content on IPFS (AES-GCM encrypted).
 * Used when Stirling-PDF converts a scanned document to markdown.
 * Uses the provided CryptoKey for encryption.
 */
export async function storeMarkdown(
  content: string,
  encryptionKey: CryptoKey,
  contentHash: string,
  fileName?: string,
): Promise<PinResult> {
  const encoder = new TextEncoder();
  const bytes = encoder.encode(content);
  return pinToIPFS(bytes, encryptionKey, contentHash, fileName ?? 'document.md');
}