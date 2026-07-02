import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    agent: 'validator',
    service: 'Validator Agent — Independent attestation verification, proof chain validation, trust scoring',
    version: '0.1.0',
    chain: 'casper',
    identity: 'validator.cspr',
    payment: 'x402',
    operations: [
      { name: 'verify', description: 'Verify a single attestation', method: 'POST', path: '/api/x402/verify' },
      { name: 'prove', description: 'Validate an entire proof chain', method: 'POST', path: '/api/x402/prove' },
      { name: 'status', description: 'Check session status', method: 'GET', path: '/api/x402/status' },
    ],
    standards: ['EAS', 'ERC-8004', 'ERC-8122'],
    did: '/.well-known/did/nostr/{pubkey}.json',
    endpoints: {
      mcp: '_validator._mcp._agents.sigil',
      health: '/api/health',
      serviceInfo: '/api/x402/service-info',
    },
  });
}
