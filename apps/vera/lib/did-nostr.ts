/**
 * Vera — did:nostr Service
 *
 * Serves Vera's own did:nostr document and resolves other agents' DIDs.
 */

import type { AgentRecord } from './types';

/** Vera's Nostr public key (placeholder — real key from env) */
export const VERA_NOSTR_PUBKEY =
  process.env.VERA_NOSTR_PUBKEY ?? 'vera-demo-ed25519-pubkey';

/**
 * Build Vera's own did:nostr document.
 * Other agents query this to find Vera and learn what Vera knows.
 */
export function buildDidNostrDoc(knownAgents: AgentRecord[]): Record<string, unknown> {
  return {
    id: VERA_NOSTR_PUBKEY,
    alsoKnownAs: ['https://vera.trust'],
    verificationMethod: [
      {
        id: `#${VERA_NOSTR_PUBKEY}`,
        type: 'Ed25519VerificationKey2018',
        controller: VERA_NOSTR_PUBKEY,
        publicKeyMultibase: VERA_NOSTR_PUBKEY,
      },
    ],
    service: [
      {
        id: '#agent-discovery',
        type: 'AgentDiscovery',
        serviceEndpoint: 'https://vera.trust/api/discover',
      },
      {
        id: '#agent-evaluation',
        type: 'AgentEvaluation',
        serviceEndpoint: 'https://vera.trust/api/evaluate',
      },
      {
        id: '#reputation-query',
        type: 'ReputationQuery',
        serviceEndpoint: 'https://vera.trust/api/agents',
      },
      {
        id: '#agent-registry',
        type: 'CasperRegistry',
        serviceEndpoint: 'https://casper-mcp.network/agents',
      },
    ],
    knownAgents: knownAgents.map((a) => ({
      id: a.agentId,
      name: a.name,
      endpoint: a.endpoint,
      capabilities: a.capabilities,
      did: a.didNostrUrl,
    })),
  };
}

/**
 * Resolve another agent's did:nostr document.
 */
export async function resolveAgentDid(url: string): Promise<Record<string, unknown> | null> {
  try {
    const resp = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!resp.ok) return null;
    return (await resp.json()) as Record<string, unknown>;
  } catch {
    return null;
  }
}
