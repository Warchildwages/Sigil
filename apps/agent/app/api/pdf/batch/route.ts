import { NextResponse } from 'next/server';
import { stirlingBatchExtract } from '@/lib/stirling.js';

/**
 * POST /api/pdf/batch
 * 
 * Multi-file batch PDF processing endpoint.
 * Accepts up to 20 files, processes in parallel (concurrency: 3),
 * returns an array of extraction results.
 * Individual failures don't abort the batch.
 */
export async function POST(request: Request) {
  try {
    const contentType = request.headers.get('content-type') || '';

    if (!contentType.includes('multipart/form-data')) {
      return NextResponse.json(
        { error: 'Expected multipart/form-data' },
        { status: 400 },
      );
    }

    const formData = await request.formData();
    const files: { buffer: Buffer; fileName: string }[] = [];

    for (const [key, value] of formData.entries()) {
      if (value instanceof Blob && key.startsWith('file')) {
        // Size limit per file: 50MB
        if (value.size > 50 * 1024 * 1024) {
          return NextResponse.json(
            { error: `File "${key}" too large. Maximum 50MB per file.` },
            { status: 413 },
          );
        }

        const buffer = Buffer.from(await value.arrayBuffer());
        const fileName = value.name || `${key}.pdf`;
        files.push({ buffer, fileName });
      }
    }

    if (files.length === 0) {
      return NextResponse.json(
        { error: 'At least one file is required' },
        { status: 400 },
      );
    }

    // Limit: 20 files per batch
    if (files.length > 20) {
      return NextResponse.json(
        { error: 'Maximum 20 files per batch' },
        { status: 400 },
      );
    }

    const results = await stirlingBatchExtract(files);

    return NextResponse.json({
      totalFiles: files.length,
      results,
    });
  } catch (error) {
    console.error('POST /api/pdf/batch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}