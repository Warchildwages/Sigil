import { NextResponse } from 'next/server';
import { stirlingExtractText } from '@/lib/stirling.js';

/**
 * POST /api/pdf
 * 
 * Single-file PDF processing endpoint.
 * Accepts multipart upload, delegates to Stirling for text extraction + optional OCR,
 * returns extracted text + markdown.
 * Falls back gracefully to pdf-parse if Stirling is unreachable.
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
    const file = formData.get('file');

    if (!file || !(file instanceof Blob)) {
      return NextResponse.json(
        { error: 'File is required' },
        { status: 400 },
      );
    }

    // Size limit: 50MB
    if (file.size > 50 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'File too large. Maximum 50MB.' },
        { status: 413 },
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const fileName = (formData.get('fileName') as string) || file.name || 'document.pdf';

    const result = await stirlingExtractText(buffer, fileName);

    return NextResponse.json({
      text: result.text,
      markdown: result.markdown,
      ocrApplied: result.ocrApplied,
      fileName,
    });
  } catch (error) {
    console.error('POST /api/pdf error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}