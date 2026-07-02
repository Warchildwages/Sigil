import type { DocumentCompleteness } from '@signet/shared';

/**
 * Check a document's text for required legal document elements.
 * This is a heuristic check — not a substitute for legal review.
 * Runs BEFORE the AI analysis, regardless of document type.
 */
export function verifyDocumentCompleteness(text: string, fileName?: string): DocumentCompleteness {
  const normalized = text.toLowerCase();
  const warnings: string[] = [];

  const requiredElements = {
    signatures: /sign(?:ature|ed|ing|s?)\b|signatory|undersigned|executed\s+by/i.test(text),
    dates: /\b(?:19|20)\d{2}\b/.test(text) || /dated?\s*:?\s*\d/i.test(text),
    parties: /between\b|party\b|parties\b|hereinafter\b|referred\s+to\s+as\b/i.test(text),
    terms: normalized.length > 200,
    governingLaw: /governing\s+law|jurisdiction|venue|arbitration|forum\s+selection/i.test(text),
  };

  const missingElements: string[] = [];

  if (!requiredElements.signatures) {
    missingElements.push('signatures');
    warnings.push('No signature block detected — document may not be ready for signing.');
  }

  if (!requiredElements.dates) {
    missingElements.push('dates');
    warnings.push('No date field detected — ensure the document has an effective date.');
  }

  if (!requiredElements.parties) {
    missingElements.push('parties');
    warnings.push('No party identification detected — document should specify all involved parties.');
  }

  if (!requiredElements.terms) {
    missingElements.push('terms');
    warnings.push('Document text is very short — may not contain substantive terms.');
  }

  if (!requiredElements.governingLaw) {
    missingElements.push('governingLaw');
    warnings.push('No governing law or jurisdiction clause detected — recommended for legal documents.');
  }

  // Additional quality checks
  if (normalized.length < 50) {
    warnings.push('Document appears to be empty or contains negligible text.');
  }

  if (fileName && /\.(jpg|jpeg|png|gif|bmp|webp)$/i.test(fileName)) {
    warnings.push('Image file detected — Signet can attest image hashes but cannot extract text for analysis.');
  }

  return {
    isComplete: missingElements.length === 0,
    missingElements,
    requiredElements,
    warnings,
  };
}