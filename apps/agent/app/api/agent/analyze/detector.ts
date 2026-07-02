import type { AutoDetectedContext, EmphasisVector } from '@sigil/shared';

/**
 * Scans document text for keyword signals to auto-detect the legal context.
 * The agent uses this to weight its comprehensive analysis prompt without
 * requiring user-facing persona selection.
 *
 * consumer-contract: terms of service, subscriptions, purchases, fees
 * business-agreement: vendor contracts, NDAs, partnership agreements, IP
 * notarized-document: notary certificates, acknowledgments, jurats
 * general-legal: fallback when no specific signals match
 */
export function detectDocumentContext(text: string): AutoDetectedContext {
  const lower = text.toLowerCase();

  // ── Notarized document signals ──
  const notarySignals = [
    'notary public',
    'acknowledgment',
    'jurat',
    'sworn to',
    'subscribed before me',
    'notarial',
    'notary seal',
    'notary certificate',
    'personally appeared before me',
    'witness my hand',
  ];
  const notaryHits = notarySignals.filter((s) => lower.includes(s)).length;
  if (notaryHits >= 2) return 'notarized-document';

  // ── Consumer contract signals ──
  const consumerSignals = [
    'consumer',
    'subscription',
    'auto-renewal',
    'monthly fee',
    'purchase agreement',
    'terms of service',
    'refund policy',
    'cancellation',
    'billing cycle',
    'recurring payment',
    'money-back guarantee',
    'warranty',
  ];
  const consumerHits = consumerSignals.filter((s) => lower.includes(s)).length;
  if (consumerHits >= 2) return 'consumer-contract';

  // ── Business agreement signals ──
  const businessSignals = [
    'indemnification',
    'indemnify',
    'intellectual property',
    'governing law',
    'jurisdiction',
    'confidentiality',
    'non-disclosure',
    'nda',
    'vendor agreement',
    'service agreement',
    'termination',
    'breach of contract',
    'arbitration',
    'force majeure',
    'assignment',
    'severability',
  ];
  const businessHits = businessSignals.filter((s) => lower.includes(s)).length;
  if (businessHits >= 2) return 'business-agreement';

  // ── Fallback: notary with one signal only ──
  if (notaryHits === 1) return 'notarized-document';

  // ── Fallback: consumer with one signal only ──
  if (consumerHits === 1) return 'consumer-contract';

  // ── Fallback: business with one signal only ──
  if (businessHits === 1) return 'business-agreement';

  return 'general-legal';
}

// ── Complexity Scorer (inlined from @sigil/agent-core) ──

interface ComplexityScoreInput {
  documentType: string;
  textLength: number;
  seedTextMatchCount: number;
}

const HIGH_COMPLEXITY_TYPES = new Set([
  'contract',
  'service-agreement',
  'employment-contract',
  'purchase-agreement',
  'mortgage',
  'governance-proposal',
]);

const MEDIUM_COMPLEXITY_TYPES = new Set([
  'NDA',
  'lease',
  'vendor-agreement',
  'privacy-policy',
  'addendum',
  'business-agreement',
]);

export function scoreComplexity(input: ComplexityScoreInput): number {
  const { documentType, textLength, seedTextMatchCount } = input;

  let typeScore: number;
  if (HIGH_COMPLEXITY_TYPES.has(documentType)) typeScore = 0.9;
  else if (MEDIUM_COMPLEXITY_TYPES.has(documentType)) typeScore = 0.5;
  else typeScore = 0.2;

  let lengthScore: number;
  if (textLength <= 0) lengthScore = 0;
  else if (textLength < 500) lengthScore = 0.1;
  else if (textLength < 2000) lengthScore = 0.3;
  else if (textLength < 5000) lengthScore = 0.5;
  else if (textLength < 10000) lengthScore = 0.7;
  else if (textLength < 25000) lengthScore = 0.85;
  else lengthScore = 1.0;

  let matchScore: number;
  if (seedTextMatchCount <= 0) matchScore = 0;
  else if (seedTextMatchCount === 1) matchScore = 0.2;
  else if (seedTextMatchCount === 2) matchScore = 0.4;
  else if (seedTextMatchCount === 3) matchScore = 0.6;
  else if (seedTextMatchCount <= 5) matchScore = 0.8;
  else matchScore = 1.0;

  const score = typeScore * 0.3 + lengthScore * 0.3 + matchScore * 0.4;
  return Math.min(1, Math.max(0, Math.round(score * 100) / 100));
}

export function getComplexityLabel(
  score: number,
): 'trivial' | 'low' | 'medium' | 'high' | 'critical' {
  if (score <= 0.15) return 'trivial';
  if (score <= 0.35) return 'low';
  if (score <= 0.65) return 'medium';
  if (score <= 0.85) return 'high';
  return 'critical';
}

// ── Persona Detector (inlined from @sigil/agent-core) ──

interface KeywordRule {
  keywords: string[];
  tag: EmphasisVector;
  weight: number;
}

const KEYWORD_RULES: KeywordRule[] = [
  {
    keywords: ['consumer', 'customer', 'refund', 'warranty', 'unfair', 'deceptive', 'cooling-off'],
    tag: 'consumer-protection',
    weight: 3,
  },
  {
    keywords: [
      'indemnify',
      'indemnification',
      'liquidated damages',
      'limitation of liability',
      'force majeure',
      'termination',
      'breach',
      'default',
      'penalty',
      'severability',
      'governing law',
      'arbitration',
      'dispute resolution',
      'venue',
      'jurisdiction',
    ],
    tag: 'contract-risk',
    weight: 3,
  },
  {
    keywords: [
      'notary',
      'notarized',
      'notarization',
      'acknowledgment',
      'jurat',
      'witness',
      'sworn',
      'affidavit',
      'self-proving',
    ],
    tag: 'notary-compliance',
    weight: 3,
  },
  {
    keywords: [
      'GDPR',
      'CCPA',
      'HIPAA',
      'PCI',
      'regulation',
      'compliance',
      'regulatory',
      'statute',
      'act',
      'directive',
      'framework',
      'fiduciary',
      'SEC',
      'FINRA',
      'IRS',
      'FLSA',
      'FMLA',
      'disclosure',
      'reporting requirement',
    ],
    tag: 'regulatory',
    weight: 3,
  },
  {
    keywords: [
      'quorum',
      'proposal',
      'vote',
      'delegation',
      'multisig',
      'treasury',
      'constitution',
      'bylaws',
      'governance',
      'DAO',
      'delegate',
      'consensus',
      'ratification',
    ],
    tag: 'governance',
    weight: 3,
  },
];

export function detectPersona(documentText: string): EmphasisVector[] {
  const lowerText = documentText.toLowerCase();
  const tagScores = new Map<EmphasisVector, number>();
  const MIN_SCORE = 2;

  for (const rule of KEYWORD_RULES) {
    const matches = rule.keywords.filter((kw) => lowerText.includes(kw.toLowerCase())).length;
    if (matches > 0) {
      const current = tagScores.get(rule.tag) ?? 0;
      tagScores.set(rule.tag, current + matches * rule.weight);
    }
  }

  const detected = Array.from(tagScores.entries())
    .filter(([_, score]) => score >= MIN_SCORE)
    .sort(([_, a], [__, b]) => b - a)
    .map(([tag]) => tag);

  if (detected.length === 0) return ['contract-risk'];
  return detected;
}
