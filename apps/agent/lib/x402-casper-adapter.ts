// Casper x402 Adapter for Sigil
//
// Casper x402 payment verification + payment-required response builder.
// Uses @make-software/casper-x402 SDK's Exact scheme for local EIP-712
// verification (no remote facilitator calls needed).
//
// Gracefully degrades when CASPER env vars are not set — routes fall
// through to Base/Circle verification.

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

/** Casper network CAIP-2 identifier — testnet for buildathon, mainnet later */
export const CASPER_NETWORK =
  process.env.CASPER_NETWORK || 'casper:casper-test';

/** Sigil's agent wallet address on Casper (receives payments) */
export const SIGIL_CASPER_WALLET =
  process.env.SIGIL_CASPER_WALLET_ADDRESS || '';

/** Casper agent secret key (PEM content or hex) for signing settlements */
export const CASPER_AGENT_SECRET_KEY =
  process.env.CASPER_AGENT_SECRET_KEY || '';

/** Whether Casper x402 is configured (both wallet + key set) */
export const CASPER_X402_CONFIGURED =
  Boolean(SIGIL_CASPER_WALLET) && Boolean(CASPER_AGENT_SECRET_KEY);

/**
 * Validate that a Casper secret key is safe to use.
 * Rejects filesystem paths to prevent path traversal attacks.
 *
 * Accepted formats:
 *   - PEM content (starts with "-----BEGIN")
 *   - Hex-encoded key (64+ hex characters)
 *
 * Rejected:
 *   - Filesystem paths (contains "/", "\\", "..")
 *   - Too short to be a valid key
 */
export function isValidCasperSecretKey(key: string): boolean {
  if (!key || key.length < 64) return false;
  // Reject filesystem paths
  if (key.includes('/') || key.includes('\\') || key.includes('..')) return false;
  // Accept PEM or hex
  return key.startsWith('-----BEGIN') || /^[0-9a-fA-F]{64,}$/.test(key.trim());
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CasperPaymentResult {
  valid: boolean;
  amount?: string;
  payer?: string;
  settlementTx?: string;
  error?: string;
}

export interface CasperServiceListing {
  network: string;
  walletAddress: string;
  configured: boolean;
  operations: Record<string, { price: number; description: string }>;
}

// ---------------------------------------------------------------------------
// Payment Verification
// ---------------------------------------------------------------------------

/**
 * Verify a Casper x402 payment using the local SDK verifier.
 *
 * Dynamically imports @make-software/casper-x402 to avoid build errors
 * when the package's internal @x402/core types don't resolve in strict mode.
 * At runtime, all types are available — the SDK handles EIP-712 signature
 * verification locally against Casper's chain config.
 */
export async function verifyCasperX402Payment(
  request: Request,
  _operation: string,
  _expectedAmountUSDC: number,
): Promise<CasperPaymentResult> {
  if (!CASPER_X402_CONFIGURED) {
    return { valid: false, error: 'CASPER_NOT_CONFIGURED' };
  }

  const paymentHeader =
    request.headers.get('X-Casper-Payment') ||
    request.headers.get('X-Payment-Id');

  if (!paymentHeader) {
    return { valid: false, error: 'PAYMENT_HEADER_MISSING' };
  }

  try {
    // Dynamic import to bypass strict type resolution in pnpm monorepo
    const { getNetworkConfig, createFacilitatorCasperSigner } =
      await import('@make-software/casper-x402');
    const { ExactCasperScheme } =
      await import('@make-software/casper-x402/exact/facilitator');

    const networkConfig = getNetworkConfig(CASPER_NETWORK);
    const signer = await createFacilitatorCasperSigner(
      CASPER_AGENT_SECRET_KEY,
      undefined,
      networkConfig.rpcUrl,
    );

    const payload = JSON.parse(paymentHeader);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const facilitator = new ExactCasperScheme(signer as any);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result: any = await facilitator.verify(payload, payload.requirements);

    return {
      valid: result.isValid !== false && result.valid !== false,
      amount: payload?.requirements?.amount?.toString(),
      payer: payload?.payload?.from,
      error: result.reason || result.error,
    };
  } catch (err) {
    return {
      valid: false,
      error: `Casper verification: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}

/**
 * Settle a Casper x402 payment (transfer from payer to Sigil).
 * Call AFTER successful operation execution.
 */
export async function settleCasperX402Payment(
  paymentHeader: string,
  _operation: string,
  amountUSDC: string,
): Promise<CasperPaymentResult> {
  if (!CASPER_X402_CONFIGURED) {
    return { valid: false, error: 'CASPER_NOT_CONFIGURED' };
  }

  try {
    const { getNetworkConfig, createFacilitatorCasperSigner } =
      await import('@make-software/casper-x402');
    const { ExactCasperScheme } =
      await import('@make-software/casper-x402/exact/facilitator');

    const networkConfig = getNetworkConfig(CASPER_NETWORK);
    const signer = await createFacilitatorCasperSigner(
      CASPER_AGENT_SECRET_KEY,
      undefined,
      networkConfig.rpcUrl,
    );

    const payload = JSON.parse(paymentHeader);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const facilitator = new ExactCasperScheme(signer as any);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result: any = await facilitator.settle(payload, payload.requirements);

    return {
      valid: result.isValid !== false || result.valid !== false,
      amount: amountUSDC,
      payer: payload?.payload?.from,
      settlementTx: result.transaction || result.transactionHash,
      error: result.reason || result.error,
    };
  } catch (err) {
    return {
      valid: false,
      error: `Casper settlement: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}

// ---------------------------------------------------------------------------
// 402 Response Builder
// ---------------------------------------------------------------------------

/**
 * Build a 402 Payment Required response for Casper's Exact x402 scheme.
 */
export function casperPaymentRequiredResponse(
  operation: string,
  priceUSDC: number,
): Response {
  const body = {
    error: 'Payment required',
    code: 'PAYMENT_REQUIRED',
    details: `This endpoint accepts x402 payment on Casper. ${priceUSDC} USDC per ${operation} operation.`,
    payment_required: {
      network: CASPER_NETWORK,
      scheme: 'exact',
      recipient: SIGIL_CASPER_WALLET,
      asset: 'CSPR',
      amount: String(priceUSDC),
      operation,
    },
    service_id: 'sigil-v1-casper',
  };

  return new Response(JSON.stringify(body), {
    status: 402,
    headers: {
      'Content-Type': 'application/json',
      'X-Payment-Required': 'true',
      'X-Service-Id': 'sigil-v1',
      'X-Network': CASPER_NETWORK,
    },
  });
}

// ---------------------------------------------------------------------------
// Service Info
// ---------------------------------------------------------------------------

/**
 * Build the Casper-specific portion of Sigil's service listing.
 */
export function casperServiceInfo(): CasperServiceListing {
  return {
    network: CASPER_NETWORK,
    walletAddress: SIGIL_CASPER_WALLET,
    configured: CASPER_X402_CONFIGURED,
    operations: {
      witness: {
        price: 0.02,
        description: 'Agreement witnessing — attests on Casper AgentAttest',
      },
      escrow: {
        price: 0.02,
        description: 'Escrow witness — attests on Casper AgentAttest',
      },
      dispute: {
        price: 0.10,
        description: 'Dispute resolution — attests on Casper AgentAttest',
      },
      timestamp: {
        price: 0.005,
        description: 'Proof of existence — attests on Casper AgentAttest',
      },
      compliance: {
        price: 0.05,
        description: 'Compliance audit — attests on Casper AgentAttest',
      },
    },
  };
}
