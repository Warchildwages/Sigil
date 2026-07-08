/**
 * Vera — Agent Discovery via Casper Registry
 *
 * Discovers agents from Casper's agent registry (MCP or whatever
 * the Casper ecosystem provides). Returns agent records that Vera
 * can then verify and evaluate.
 */

import type { AgentRecord } from './types';

// Known agents for the demo — in production these come from Casper MCP
const SEED_AGENTS: AgentRecord[] = [
  {
    agentId: 'luna',
    name: 'Luna 🌙',
    description: 'Full-service event agent — tickets, gigs, venue management. Powered by AllFans.',
    ed25519PublicKey: 'demo-luna-ed25519-pubkey',
    endpoint: 'https://luna-agent.vercel.app',
    capabilities: ['events', 'tickets', 'gigs', 'venue', 'marketplace', 'transfer', 'check-in'],
    chains: ['casper', 'base', 'arc'],
    didNostrUrl: 'https://luna-agent.vercel.app/.well-known/did/nostr/demo-luna-pubkey.json',
    registeredAt: '2026-06-01T00:00:00Z',
  },
  {
    agentId: 'sigil',
    name: 'Sigil 🦅',
    description: 'On-chain notary and legal document agent. Powered by Signet.',
    ed25519PublicKey: 'demo-sigil-ed25519-pubkey',
    endpoint: 'https://sigil.vercel.app',
    capabilities: ['notary', 'witness', 'escrow', 'dispute', 'timestamp', 'analyze'],
    chains: ['casper', 'base', 'arc'],
    didNostrUrl: 'https://sigil.vercel.app/.well-known/did/nostr/demo-sigil-pubkey.json',
    registeredAt: '2026-06-01T00:00:00Z',
  },
  {
    agentId: 'ticketbot',
    name: 'TicketBot',
    description: 'Event ticket reseller — secondary marketplace.',
    ed25519PublicKey: 'demo-ticketbot-bad-key',
    endpoint: 'https://ticketbot.example.com',
    capabilities: ['events', 'tickets', 'resale'],
    chains: ['casper'],
    registeredAt: '2026-06-15T00:00:00Z',
  },
];

/**
 * Discover agents from Casper's agent registry.
 * In production: queries Casper MCP for registered agents.
 * For demo: returns seed agents.
 */
export async function discoverAgents(): Promise<AgentRecord[]> {
  // TODO: Query Casper MCP for registered agents
  // const mcpAgents = await queryCasperMCP({ capability: '*' });
  return SEED_AGENTS;
}

/**
 * Discover agents filtered by capability.
 */
export async function discoverByCapability(capability: string): Promise<AgentRecord[]> {
  const all = await discoverAgents();
  return all.filter((a) =>
    a.capabilities.some((c) => c.toLowerCase().includes(capability.toLowerCase())),
  );
}

/**
 * Get a single agent by ID.
 */
export async function getAgent(agentId: string): Promise<AgentRecord | null> {
  const all = await discoverAgents();
  return all.find((a) => a.agentId === agentId) ?? null;
}
