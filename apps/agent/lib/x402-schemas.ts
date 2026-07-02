// x402 Request Validation Library
//
// Centralized Zod schema validation helpers for all x402 route handlers.
// Schemas are defined in @sigil/shared/validation — this module provides
// the parsing helper used by all x402 routes.
//
// Phase B — Production hardening.

import type { NextRequest } from 'next/server';
import type { z } from 'zod';

// Re-export all schemas from shared so routes can import from one place
export {
  witnessRequestSchema,
  escrowWitnessRequestSchema,
  disputeResolutionRequestSchema,
  timestampRequestSchema,
  complianceRequestSchema,
  reputationRequestSchema,
  oracleRequestSchema,
  milestoneRequestSchema,
  translateRequestSchema,
} from '@sigil/shared';

// Re-export types from shared
export type {
  WitnessRequest,
  WitnessResponse,
  EscrowWitnessRequest,
  EscrowWitnessResponse,
  DisputeResolutionRequest,
  DisputeResolutionResponse,
} from '@sigil/shared';

/**
 * Parse and validate JSON body against a Zod schema.
 * Returns typed result or throws a Response with 400 status.
 *
 * Usage:
 *   const body = await parseX402Body(request, witnessRequestSchema);
 */
export async function parseX402Body<T>(request: NextRequest, schema: z.ZodSchema<T>): Promise<T> {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    throw new Response(
      JSON.stringify({
        error: 'Invalid request body',
        details: 'Request body must be valid JSON.',
      }),
      { status: 400, headers: { 'Content-Type': 'application/json' } },
    );
  }

  const result = schema.safeParse(raw);

  if (!result.success) {
    const errors = result.error.issues.map(
      (issue: z.ZodIssue) => `${issue.path.join('.')}: ${issue.message}`,
    );
    throw new Response(
      JSON.stringify({
        error: 'Validation failed',
        details: errors.join('; '),
        issues: result.error.issues,
      }),
      { status: 400, headers: { 'Content-Type': 'application/json' } },
    );
  }

  return result.data;
}

/**
 * Generate a deterministic service ID based on chain ID.
 */
export function generateServiceId(chainId: number): string {
  const chainName =
    chainId === 8453
      ? 'base-mainnet'
      : chainId === 84532
        ? 'base-sepolia'
        : chainId === 5042002
          ? 'arc-testnet'
          : chainId === 43114
            ? 'avalanche-mainnet'
            : chainId === 43113
              ? 'avalanche-fuji'
              : `chain-${chainId}`;
  return `sigil-v1-${chainName}`;
}
