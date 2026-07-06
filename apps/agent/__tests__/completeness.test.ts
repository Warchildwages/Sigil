import { describe, it, expect } from 'vitest';
import { verifyDocumentCompleteness } from '../app/api/analyze/completeness';

describe('verifyDocumentCompleteness', () => {
  it('flags document with no signature block', () => {
    const text = 'This is an agreement between Party A and Party B effective January 1, 2024. It is governed by the laws of Delaware.';
    const result = verifyDocumentCompleteness(text);

    expect(result.isComplete).toBe(false);
    expect(result.missingElements).toContain('signatures');
    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.warnings.some((w) => w.includes('signature'))).toBe(true);
  });

  it('passes a complete document with all elements', () => {
    const text = `
      AGREEMENT
      This agreement is entered into between Party A ("Company") and Party B ("Client").
      Effective as of January 15, 2024.
      
      TERMS
      Party A agrees to provide services as outlined in Schedule A. Party B agrees to pay the fees specified.
      
      GOVERNING LAW
      This agreement shall be governed by the laws of the State of Delaware.
      
      SIGNATURES
      Signed: _________________ Date: _________
      Party A Representative
      
      Signed: _________________ Date: _________
      Party B Representative
    `;
    const result = verifyDocumentCompleteness(text);

    expect(result.isComplete).toBe(true);
    expect(result.missingElements).toHaveLength(0);
    expect(result.requiredElements.signatures).toBe(true);
    expect(result.requiredElements.dates).toBe(true);
    expect(result.requiredElements.parties).toBe(true);
    expect(result.requiredElements.terms).toBe(true);
    expect(result.requiredElements.governingLaw).toBe(true);
  });

  it('flags empty or very short documents', () => {
    const result = verifyDocumentCompleteness('Short text');
    expect(result.warnings.some((w) => w.includes('negligible text'))).toBe(true);
    expect(result.isComplete).toBe(false);
  });

  it('flags image files with appropriate warning', () => {
    const result = verifyDocumentCompleteness('Some document text here for analysis', 'contract.jpg');
    expect(result.warnings.some((w) => w.includes('Image file'))).toBe(true);
  });

  it('detects missing governing law', () => {
    const text = `
      AGREEMENT between Party A and Party B as of 2024-01-01.
      Party A shall deliver services. Party B shall pay $5000.
      SIGNED: _______________
    `;
    const result = verifyDocumentCompleteness(text);

    expect(result.requiredElements.governingLaw).toBe(false);
    expect(result.missingElements).toContain('governingLaw');
  });

  it('detects date from year pattern', () => {
    const text = 'This agreement is signed on 2024 by the parties. Signature: ________';
    const result = verifyDocumentCompleteness(text);

    expect(result.requiredElements.dates).toBe(true);
  });
});