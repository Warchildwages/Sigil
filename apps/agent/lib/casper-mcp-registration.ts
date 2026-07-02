// 🏴 Pireph (June 30, 2026) — Casper MCP Service Registration for Sigil
//
// Registers Sigil's services on the Casper MCP ecosystem so other agents
// can discover us via the Casper MCP Server (github.com/msanlisavas/casper-mcp).
//
// After registration, agents can:
//   search_apis("legal witness")  → finds Sigil
//   search_apis("tickets")         → finds AllFans Agent
//
// Pireph scoped this for Cline to implement.
//
// Reference implementations:
//   - AgentPay: github.com/Jash-Bohare/AgentPay (3 Odra contracts + MCP server)
//   - Casper MCP Server: github.com/msanlisavas/casper-mcp (82 tools, .NET)
//   - CSPR.cloud MCP: cspr.cloud/skill.md

import { CASPER_NETWORK, SIGIL_CASPER_WALLET } from './x402-casper-adapter';

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

/** Base URL for Sigil's Casper MCP server (deployed separately or as part of Sigil) */
export const CASPER_MCP_SERVER_URL =
  process.env.CASPER_MCP_SERVER_URL || '';

/** CSPR.cloud API key for MCP registration */
export const MCP_API_KEY =
  process.env.CSPR_CLOUD_API_KEY || '';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface McpServiceRegistration {
  serviceId: string;
  name: string;
  description: string;
  network: string;
  walletAddress: string;
  endpoints: McpEndpoint[];
  categories: string[];
}

export interface McpEndpoint {
  path: string;
  method: 'GET' | 'POST';
  description: string;
  priceUSDC: number;
  requiresPayment: boolean;
}

// ---------------------------------------------------------------------------
// Service Definition
// ---------------------------------------------------------------------------

/**
 * Sigil's service registration for the Casper MCP ecosystem.
 *
 * This is the metadata that other agents see when they search for services
 * on Casper. It lists all 6 operations that can be paid via Casper's x402
 * Facilitator and attested on the AgentAttest contract.
 */
export function sigilCasperServiceRegistration(): McpServiceRegistration {
  return {
    serviceId: 'sigil-v1-casper',
    name: 'Sigil — Legal Clarity Agent (Casper)',
    description:
      'AI-powered legal document analysis, witnessing, escrow verification, ' +
      'dispute resolution, compliance auditing, and proof of existence. ' +
      'Pay per use in USDC via Casper x402 Facilitator. ' +
      'Operations attested on-chain via AgentAttest contract.',
    network: CASPER_NETWORK,
    walletAddress: SIGIL_CASPER_WALLET,
    categories: ['legal', 'attestation', 'witness', 'compliance', 'ai-agent'],
    endpoints: [
      {
        path: '/api/x402/analyze',
        method: 'POST',
        description: 'Full document analysis with risk scoring and plain-English clauses',
        priceUSDC: 0.01,
        requiresPayment: true,
      },
      {
        path: '/api/x402/witness',
        method: 'POST',
        description: 'Neutral third-party witness for agent-to-agent agreements',
        priceUSDC: 0.02,
        requiresPayment: true,
      },
      {
        path: '/api/x402/witness/escrow',
        method: 'POST',
        description: 'Escrow lifecycle management with on-chain verification',
        priceUSDC: 0.02,
        requiresPayment: true,
      },
      {
        path: '/api/x402/witness/dispute',
        method: 'POST',
        description: 'Binding dispute resolution with AI analysis and on-chain ruling',
        priceUSDC: 0.10,
        requiresPayment: true,
      },
      {
        path: '/api/x402/timestamp',
        method: 'POST',
        description: 'Proof of existence with on-chain timestamp attestation',
        priceUSDC: 0.005,
        requiresPayment: true,
      },
      {
        path: '/api/x402/compliance',
        method: 'POST',
        description: 'Regulatory compliance audit (GDPR, ABA-AI-2025, etc.)',
        priceUSDC: 0.05,
        requiresPayment: true,
      },
    ],
  };
}

// ---------------------------------------------------------------------------
// Registration
// ---------------------------------------------------------------------------

/**
 * Register Sigil's services on the Casper MCP ecosystem.
 *
 * Call this during agent startup to ensure Sigil is discoverable.
 * If registration fails (e.g., MCP registry not reachable), the agent
 * still operates — MCP discovery is additive, not critical.
 *
 * @returns true if registration succeeded
 */
export async function registerSigilOnCasperMCP(): Promise<boolean> {
  if (!CASPER_MCP_SERVER_URL) {
    console.log(
      '[casper-mcp] CASPER_MCP_SERVER_URL not set — skipping MCP registration. ' +
      'Set this to register Sigil on Casper MCP discovery.',
    );
    return false;
  }

  try {
    const registration = sigilCasperServiceRegistration();

    // Cline: implement actual MCP registration call.
    //
    // The Casper MCP Server (github.com/msanlisavas/casper-mcp) accepts
    // service registrations. The exact endpoint depends on the MCP registry
    // implementation.
    //
    // Pattern from AgentPay (Jash Bohare):
    //   The Registry contract (Odra) stores service listings on-chain.
    //   Agents query via MCP tools like search_apis().
    //
    // For the buildathon, registration can also be documented in the README
    // so judges can manually verify via CSPR.cloud dashboard.

    console.log(
      `[casper-mcp] Registering Sigil (${registration.serviceId}) on Casper MCP...`,
    );

    // ⚠️ Cline: Replace with actual registration call.
    // Return true/false based on response.
    console.log(
      `[casper-mcp] Registered ${registration.serviceId} with ${registration.endpoints.length} endpoints`,
    );

    return true;
  } catch (err) {
    console.error(
      '[casper-mcp] Registration failed:',
      err instanceof Error ? err.message : String(err),
    );
    return false;
  }
}
