import { describe, it, expect } from 'vitest';
import { getFallbackAnalysis } from '../../src/app/api/analyze/fallback';
import { verifyDocumentCompleteness } from '../../src/app/api/analyze/completeness';

describe('getFallbackAnalysis', () => {
  it('returns a valid AnalyzeResult for any valid contentHash', () => {
    const result = getFallbackAnalysis('0xabcdef1234567890');
    expect(result).toHaveProperty('overallRisk');
    expect(result).toHaveProperty('findings');
    expect(result).toHaveProperty('recommendation');
    expect(['low', 'moderate', 'high', 'critical']).toContain(result.overallRisk);
    expect(['sign', 'review', 'reject']).toContain(result.recommendation);
    expect(Array.isArray(result.findings)).toBe(true);
    // Findings may be empty when no LLM API key is set (fallback returns stub)
  });

  it('produces consistent results for the same hash', () => {
    const hash = '0xdeadbeef';
    const result1 = getFallbackAnalysis(hash);
    const result2 = getFallbackAnalysis(hash);
    expect(result1).toEqual(result2);
  });

  it('returns consistent shape across any valid hash', () => {
    // Fallback analysis was simplified June 20 to stop producing fake variants.
    // Verify the shape is correct across multiple hashes.
    for (let i = 0; i < 20; i++) {
      const hash = `0x${i.toString(16).padStart(64, '0')}`;
      const result = getFallbackAnalysis(hash);
      expect(result).toHaveProperty('overallRisk');
      expect(result).toHaveProperty('findings');
      expect(result).toHaveProperty('recommendation');
      expect(Array.isArray(result.findings)).toBe(true);
    }
  });

  it('all findings have valid risk levels', () => {
    const result = getFallbackAnalysis('0x1234567890');
    const validRisks = ['low', 'moderate', 'high', 'critical'];
    for (const finding of result.findings) {
      expect(validRisks).toContain(finding.risk);
      expect(finding.clause).toBeTruthy();
      expect(finding.concern).toBeTruthy();
      expect(finding.recommendation).toBeTruthy();
    }
  });
});

describe('analyze route integration (conceptual)', () => {
  it('completeness check returns correct shape', () => {
    const result = verifyDocumentCompleteness('Test document with between Party A and Party B. Signed 2024. Signature: ____');
    expect(result).toHaveProperty('isComplete');
    expect(result).toHaveProperty('missingElements');
    expect(result).toHaveProperty('requiredElements');
    expect(result).toHaveProperty('warnings');
    expect(Array.isArray(result.missingElements)).toBe(true);
    expect(Array.isArray(result.warnings)).toBe(true);
  });
});