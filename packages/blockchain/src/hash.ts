export async function hashDocument(file: File | Buffer): Promise<`0x${string}`> {
  let buffer: ArrayBuffer;

  if (file instanceof File) {
    buffer = await file.arrayBuffer();
  } else {
    buffer = file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength) as ArrayBuffer;
  }

  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');

  return `0x${hashHex}`;
}

export async function verifyHash(
  file: File | Buffer,
  expectedHash: string,
): Promise<boolean> {
  const actualHash = await hashDocument(file);
  return actualHash.toLowerCase() === expectedHash.toLowerCase();
}

export async function hashCanvasCapture(
  canvasData: ImageData,
): Promise<`0x${string}`> {
  const hashBuffer = await crypto.subtle.digest('SHA-256', canvasData.data.buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');

  return `0x${hashHex}`;
}