import { NextResponse } from 'next/server';
import { discoverAgents } from '../../../../lib/discovery';
import { buildDidNostrDoc } from '../../../../lib/did-nostr';

export async function GET() {
  const agents = await discoverAgents();
  const didDoc = buildDidNostrDoc(agents);

  return NextResponse.json({
    serviceId: 'vera-v1',
    name: 'Vera — Agent Trust Authority',
    description:
      'Vera discovers agents on the Casper registry, verifies their identity via Ed25519 keys ' +
      'and did:nostr documents, tests their capabilities, and aggregates reputation from ' +
      'transaction history, dispute records, and user reports. All results are attested on EAS. ' +
      'Foreign agents query Vera to find trusted counterparties.',
    endpoint: 'https://vera.trust',
    category: 'trust-authority',
    priceUSDC: 0,
    operations: {
      discover: { price: 0, description: 'List all discovered agents, optionally filter by capability' },
      evaluate: { price: 0.001, description: 'Full evaluation of all agents — verification, testing, reputation, ranking' },
      query: { price: 0, description: 'Get detailed profile for a specific agent' },
      report: { price: 0, description: 'Submit a reputation event (transaction result, dispute, user report)' },
    },
    chains: ['casper', 'base', 'arc'],
    identity: {
      method: 'Ed25519',
      did: '/.well-known/did/nostr/vera-pubkey.json',
      alsoKnownAs: ['https://vera.trust'],
    },
    didDoc,
  });
}
