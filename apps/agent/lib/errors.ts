/**
 * Sigil — Error Constants
 *
 * Centralized error codes and HTTP status constants.
 * Follows Luna's ERRORS + ERROR_CODES + HTTP pattern.
 * Restored from the original pattern that was lost during monorepo extraction.
 */

// ---------------------------------------------------------------------------
// HTTP Status Codes
// ---------------------------------------------------------------------------

export const HTTP = {
  OK: 200,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  PAYMENT_REQUIRED: 402,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE: 422,
  TOO_MANY: 429,
  SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
} as const;

// ---------------------------------------------------------------------------
// Machine-readable error codes
// ---------------------------------------------------------------------------

export const ERROR_CODES = {
  NOT_FOUND: 'NOT_FOUND',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  PAYMENT_REQUIRED: 'PAYMENT_REQUIRED',
  PAYMENT_INVALID: 'PAYMENT_INVALID',
  MISSING_PARAM: 'MISSING_PARAM',
  RATE_LIMITED: 'RATE_LIMITED',
  AUTH_REQUIRED: 'AUTH_REQUIRED',
  CSRF_INVALID: 'CSRF_INVALID',
  WITNESS_FAILED: 'WITNESS_FAILED',
  COMPLIANCE_FAILED: 'COMPLIANCE_FAILED',
  DISPUTE_ALREADY_OPEN: 'DISPUTE_ALREADY_OPEN',
  ESCROW_INSUFFICIENT: 'ESCROW_INSUFFICIENT',
  ATTESTATION_FAILED: 'ATTESTATION_FAILED',
  SWARM_UNREACHABLE: 'SWARM_UNREACHABLE',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
} as const;

// ---------------------------------------------------------------------------
// Human-readable error messages
// ---------------------------------------------------------------------------

export const ERRORS: Record<string, string> = {
  [ERROR_CODES.NOT_FOUND]: 'The requested resource was not found.',
  [ERROR_CODES.VALIDATION_ERROR]: 'Invalid input. Check the request body.',
  [ERROR_CODES.PAYMENT_REQUIRED]: 'Payment is required. Send PAYMENT-SIGNATURE (Casper) or x-402-* headers (Circle).',
  [ERROR_CODES.PAYMENT_INVALID]: 'Payment verification failed. The PAYMENT-SIGNATURE is invalid or expired.',
  [ERROR_CODES.MISSING_PARAM]: 'A required parameter is missing.',
  [ERROR_CODES.RATE_LIMITED]: 'Too many requests. Try again later.',
  [ERROR_CODES.AUTH_REQUIRED]: 'Authentication is required for this endpoint.',
  [ERROR_CODES.CSRF_INVALID]: 'Invalid or missing CSRF token.',
  [ERROR_CODES.WITNESS_FAILED]: 'Witnessing failed. Could not attest the document on-chain.',
  [ERROR_CODES.COMPLIANCE_FAILED]: 'Compliance check failed. The document does not meet the required standard.',
  [ERROR_CODES.DISPUTE_ALREADY_OPEN]: 'A dispute is already open for this escrow.',
  [ERROR_CODES.ESCROW_INSUFFICIENT]: 'Insufficient funds in escrow to cover the requested amount.',
  [ERROR_CODES.ATTESTATION_FAILED]: 'EAS attestation failed. The blockchain transaction was rejected.',
  [ERROR_CODES.SWARM_UNREACHABLE]: 'Could not reach a companion micro-agent in the swarm.',
  [ERROR_CODES.INTERNAL_ERROR]: 'An internal error occurred. Please try again.',
};
