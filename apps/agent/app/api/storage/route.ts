// @ts-nocheck
// POST /api/storage — pin encrypted document content to IPFS via Pinata
// Protected route (requires auth via middleware)
//
// Encryption flow:
//   1. Generate random 256-bit AES-GCM document key
//   2. Encrypt content with document key
//   3. Wrap document key with entity KEK (HKDF-SHA256 from JWT_SECRET + entityId)
//   4. Pin encrypted blob to IPFS
//   5. Store wrapped key (encryptedKey + keyIv) on Document record
//
// This replaces the previous pattern of using contentHash as the encryption key,
// which broke semantic security (deterministic encryption).

import { NextResponse } from 'next/server';
import { prisma } from '@sigil/db';
import { getSession } from '@/lib/auth';
import { pinToIPFS } from '@/lib/ipfs';
import {
  generateDocumentKey,
  entityKEK,
  wrapDocumentKey,
} from '@/lib/encryption-keys';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session.authenticated) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 },
      );
    }

    const formData = await request.formData();
    const file = formData.get('file');
    const contentHash = formData.get('contentHash') as string | null;
    const documentId = formData.get('documentId') as string | null;

    if (!file || !(file instanceof Blob)) {
      return NextResponse.json(
        { error: 'File is required' },
        { status: 400 },
      );
    }

    if (!contentHash || !documentId) {
      return NextResponse.json(
        { error: 'contentHash and documentId are required' },
        { status: 400 },
      );
    }

    // Verify the requesting entity owns this document
    const document = await prisma.document.findUnique({
      where: { id: documentId },
    });

    if (!document) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 },
      );
    }

    if (document.createdByEntityId !== session.entityId) {
      return NextResponse.json(
        { error: 'Not authorized to store this document' },
        { status: 403 },
      );
    }

    // Verify content hash matches
    if (document.contentHash !== contentHash) {
      return NextResponse.json(
        { error: 'Content hash mismatch' },
        { status: 400 },
      );
    }

    // Read file bytes
    const buffer = Buffer.from(await file.arrayBuffer());

    // Generate random document encryption key
    const docKey = await generateDocumentKey();

    // Pin encrypted content to IPFS using the random key
    let pinResult;
    try {
      pinResult = await pinToIPFS(
        new Uint8Array(buffer),
        docKey,
        contentHash,
        (file as File).name || undefined,
      );
    } catch (err) {
      if (err instanceof Error && err.message.includes('PINATA_JWT not configured')) {
        return NextResponse.json(
          { error: 'IPFS storage is not configured. Add PINATA_JWT to environment variables.' },
          { status: 503 },
        );
      }
      throw err;
    }

    // Wrap the document key with the entity's KEK
    const kek = await entityKEK(session.entityId);
    const { encryptedKey, keyIv } = await wrapDocumentKey(docKey, kek);

    // Update document with IPFS CID and wrapped key
    await prisma.document.update({
      where: { id: documentId },
      data: {
        contentUri: pinResult.cid,
        encryptedKey,
        keyIv,
      },
    });

    return NextResponse.json({
      cid: pinResult.cid,
      gatewayUrl: pinResult.gatewayUrl,
      documentId,
    }, { status: 201 });
  } catch (error) {
    console.error('POST /api/storage error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}