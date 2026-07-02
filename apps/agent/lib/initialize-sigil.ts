// 🦅 Sigil Startup Initializer
//
// Called once during server startup:
//   1. Display agent banner
//   2. Register on Casper MCP for agent discovery
//   3. Validate critical configuration
//
// Imported via instrumentation.ts (Next.js 14+).

import { registerSigilOnCasperMCP } from './casper-mcp-registration';
import { SIGIL_CASPER_WALLET, CASPER_AGENT_SECRET_KEY } from './x402-casper-adapter';

const SIGNET_AGENT_WALLET = process.env.SIGNET_AGENT_WALLET_ADDRESS || '';

export async function initializeSigil(): Promise<void> {
  console.log('');
  console.log('╔══════════════════════════════════════╗');
  console.log('║     🦅  Sigil v1.0.0                 ║');
  console.log('║     Legal Clarity Agent               ║');
  console.log('╚══════════════════════════════════════╝');
  console.log('');

  // Validate configuration
  const warnings: string[] = [];

  if (!SIGIL_CASPER_WALLET) {
    warnings.push('SIGIL_CASPER_WALLET_ADDRESS not set');
  }
  if (!CASPER_AGENT_SECRET_KEY) {
    warnings.push('CASPER_AGENT_SECRET_KEY not set');
  }
  if (!SIGNET_AGENT_WALLET || SIGNET_AGENT_WALLET === '0x0000000000000000000000000000000000000000') {
    warnings.push('SIGNET_AGENT_WALLET_ADDRESS not set');
  }

  if (warnings.length > 0) {
    console.log('  ⚠️  Configuration warnings:');
    for (const w of warnings) {
      console.log(`     - ${w}`);
    }
    console.log('');
  }

  // Register on Casper MCP
  const mcpOk = await registerSigilOnCasperMCP();
  if (mcpOk) {
    console.log('  ✅  Registered on Casper MCP directory');
  }
  console.log('');

  // Webhook: if MCP_URL is set but registration returned false, the
  // instrumentation hook already warned; MCP discovery is additive.
  console.log('  🦅  Sigil ready. All x402 operations online.');
  console.log('');
}
