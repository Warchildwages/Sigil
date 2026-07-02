import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    agent: 'regulatory',
    service: 'Regulatory Agent — Cross-border regulatory mapping, compliance filings, standards enforcement',
    version: '0.1.0',
    chain: 'casper',
    identity: 'regulatory.cspr',
    payment: 'x402',
    operations: [
      { name: 'map', description: 'Map cross-border regulatory requirements', method: 'POST', path: '/api/x402/map' },
      { name: 'report', description: 'Generate regulatory compliance report', method: 'POST', path: '/api/x402/report' },
      { name: 'status', description: 'Check session status', method: 'GET', path: '/api/x402/status' },
    ],
    frameworks: ['MiCA', 'SEC_Reg_D', 'FCA_MLR', 'MAS_PSA', 'FINMA_DltA'],
    did: '/.well-known/did/nostr/{pubkey}.json',
    endpoints: {
      mcp: '_regulatory._mcp._agents.sigil',
      health: '/api/health',
      serviceInfo: '/api/x402/service-info',
    },
  });
}
