/**
 * Lightweight Stirling-PDF API client.
 * 
 * Stirling-PDF is self-hosted via Docker (frooodle/s-pdf:latest) and exposes
 * a REST API at localhost:8080. This client wraps 3 operations needed by Signet:
 * - pdf-to-text: extract text for analysis
 * - pdf-to-markdown: convert for vault display
 * - ocr-pdf: handle scanned/image-based documents
 * 
 * If the Stirling container is not running, all functions gracefully fall back
 * to the existing pdf-parse/mammoth extraction in the analyze route.
 */

const STIRLING_BASE = 'http://localhost:8080';
const STIRLING_TIMEOUT_MS = 30000;

async function isStirlingAvailable(): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2000);
    const res = await fetch(`${STIRLING_BASE}/api/v1/status`, {
      signal: controller.signal,
    });
    clearTimeout(timeout);
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Extract text from a PDF buffer via Stirling.
 * Auto-applies OCR if the base extract yields very little text (likely a scan).
 * Falls back to pdf-parse if Stirling is unreachable.
 */
export async function stirlingExtractText(
  fileBuffer: Buffer,
  fileName: string,
): Promise<{ text: string; markdown?: string; ocrApplied: boolean }> {
  if (!(await isStirlingAvailable())) {
    return fallbackExtractText(fileBuffer);
  }

  // FIXME(E16): Buffer is not strictly a BlobPart — TypeScript flags the mismatch.
  // Cast is safe: Blob accepts ArrayBuffer | ArrayBufferView | Blob | string,
  // and Buffer implements Uint8Array which is compatible at runtime.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const blob = new Blob([fileBuffer as any], { type: 'application/pdf' });
  const formData = new FormData();
  formData.append('fileInput', blob, fileName);

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), STIRLING_TIMEOUT_MS);

    const res = await fetch(`${STIRLING_BASE}/api/v1/convert/pdf-to-text`, {
      method: 'POST',
      body: formData,
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!res.ok) return fallbackExtractText(fileBuffer);

    const text = await res.text();

    // If very little text was extracted, the PDF is likely a scanned image.
    // Retry with OCR.
    if (text.trim().length < 50) {
      return retryWithOcr(fileBuffer, fileName, text);
    }

    let markdown: string | undefined;
    try {
      const mdRes = await fetch(`${STIRLING_BASE}/api/v1/convert/pdf-to-markdown`, {
        method: 'POST',
        body: formData,
      });
      if (mdRes.ok) {
        markdown = await mdRes.text();
      }
    } catch {
      // markdown conversion is best-effort
    }

    return {
      text: text.slice(0, 12000),
      markdown: markdown?.slice(0, 12000),
      ocrApplied: false,
    };
  } catch {
    return fallbackExtractText(fileBuffer);
  }
}

async function retryWithOcr(
  fileBuffer: Buffer,
  fileName: string,
  initialText: string,
): Promise<{ text: string; markdown?: string; ocrApplied: boolean }> {
  const blob = new Blob([fileBuffer as BlobPart], { type: 'application/pdf' });
  const formData = new FormData();
  formData.append('fileInput', blob, fileName);

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), STIRLING_TIMEOUT_MS);

    const res = await fetch(`${STIRLING_BASE}/api/v1/convert/pdf-to-text/ocr`, {
      method: 'POST',
      body: formData,
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!res.ok) {
      return { text: initialText.slice(0, 12000), ocrApplied: false };
    }

    const text = await res.text();
    let markdown: string | undefined;
    try {
      const mdRes = await fetch(`${STIRLING_BASE}/api/v1/convert/pdf-to-markdown/ocr`, {
        method: 'POST',
        body: formData,
      });
      if (mdRes.ok) {
        markdown = await mdRes.text();
      }
    } catch {
      // best-effort
    }

    return {
      text: text.slice(0, 12000),
      markdown: markdown?.slice(0, 12000),
      ocrApplied: true,
    };
  } catch {
    return { text: initialText.slice(0, 12000), ocrApplied: false };
  }
}

/**
 * Fallback: use pdf-parse for text extraction when Stirling is unavailable.
 */
async function fallbackExtractText(
  fileBuffer: Buffer,
): Promise<{ text: string; markdown?: string; ocrApplied: boolean }> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pdfParse = require('pdf-parse') as (buf: Buffer) => Promise<{ text: string }>;
    const data = await pdfParse(fileBuffer);
    return { text: data.text.slice(0, 12000), ocrApplied: false };
  } catch {
    return { text: '', ocrApplied: false };
  }
}

/**
 * Process multiple PDFs in parallel with controlled concurrency.
 * Individual failures don't abort the batch.
 */
export async function stirlingBatchExtract(
  files: { buffer: Buffer; fileName: string }[],
  concurrency = 3,
): Promise<Array<{ fileName: string; text: string; markdown?: string; ocrApplied: boolean; error?: string }>> {
  const results: Array<{ fileName: string; text: string; markdown?: string; ocrApplied: boolean; error?: string }> = [];

  for (let i = 0; i < files.length; i += concurrency) {
    const batch = files.slice(i, i + concurrency);
    const batchResults = await Promise.allSettled(
      batch.map(async (f) => {
        try {
          const result = await stirlingExtractText(f.buffer, f.fileName);
          return { fileName: f.fileName, ...result };
        } catch (err) {
          return {
            fileName: f.fileName,
            text: '',
            ocrApplied: false,
            error: err instanceof Error ? err.message : 'Unknown error',
          };
        }
      }),
    );

    for (const r of batchResults) {
      if (r.status === 'fulfilled') {
        results.push(r.value);
      } else {
        results.push({ fileName: 'unknown', text: '', ocrApplied: false, error: r.reason });
      }
    }
  }

  return results;
}

/** Check if Stirling is running (for health checks) */
export { isStirlingAvailable };