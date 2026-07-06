// 🦅 Sigil Operation Types
//
// Centralized operation definitions mirroring Luna's luna-types.ts pattern.
// Single source of truth for all 11 legal operations.

// ---------------------------------------------------------------------------
// Operation Union
// ---------------------------------------------------------------------------

export type SigilOperation =
  | 'witness'
  | 'escrow'
  | 'dispute'
  | 'compliance'
  | 'milestone'
  | 'oracle'
  | 'reputation'
  | 'timestamp'
  | 'translate'
  | 'analyze'
  | 'knowledge';

export const SIGIL_OPERATIONS: SigilOperation[] = [
  'witness',
  'escrow',
  'dispute',
  'compliance',
  'milestone',
  'oracle',
  'reputation',
  'timestamp',
  'translate',
  'analyze',
  'knowledge',
];

// ---------------------------------------------------------------------------
// Pricing (USDC per operation)
// — Single source of truth: @sigil/shared x402-pricing.ts
// ---------------------------------------------------------------------------

import { X402_PRICING, X402_OPERATION_NAMES, X402_OPERATION_DESCRIPTIONS } from '@sigil/shared';

export const SIGIL_PRICING = X402_PRICING as Record<SigilOperation, number>;

// ---------------------------------------------------------------------------
// Display Names
// ---------------------------------------------------------------------------

export const SIGIL_OPERATION_NAMES = X402_OPERATION_NAMES as Record<SigilOperation, string>;

// ---------------------------------------------------------------------------
// Descriptions (for NLU catalog and endpoints)
// ---------------------------------------------------------------------------

export const SIGIL_OPERATION_DESCRIPTIONS = X402_OPERATION_DESCRIPTIONS as Record<SigilOperation, string>;

// ---------------------------------------------------------------------------
// Endpoint Map
// ---------------------------------------------------------------------------

export const SIGIL_ENDPOINTS: Record<SigilOperation, string> = {
  witness: '/api/x402/witness',
  escrow: '/api/x402/witness/escrow',
  dispute: '/api/x402/witness/dispute',
  compliance: '/api/x402/compliance',
  milestone: '/api/x402/milestone',
  oracle: '/api/x402/oracle',
  reputation: '/api/x402/reputation',
  timestamp: '/api/x402/timestamp',
  translate: '/api/x402/translate',
  analyze: '/api/x402/analyze',
  knowledge: '/api/x402/knowledge',
};
