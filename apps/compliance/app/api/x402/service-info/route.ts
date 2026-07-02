import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    agent: 'compliance',
    service: 'Compliance Agent — AML/KYC, sanctions screening, jurisdiction risk assessment',
    version: '0.1.0',
    chain: 'casper',
    identity: 'compliance.cspr',
    payment: 'x402',
    operations: [
      { name: 'screen', description: 'AML/KYC screen an entity', method: 'POST', path: '/api/x402/screen' },
      { name: 'report', description: 'Generate compliance report', method: 'POST', path: '/api/x402/report' },
      { name: 'status', description: 'Check session status', method: 'GET', path: '/api/x402/status' },
    ],
    attestations: {
      schema: 'compliance_report',
      revocable: false,
    },
    did: '/.well-known/did/nostr/{pubkey}.json',
    endpoints: {
      mcp: '_compliance._mcp._agents.sigil',
      health: '/api/health',
      serviceInfo: '/api/x402/service-info',
    },
  });
}
