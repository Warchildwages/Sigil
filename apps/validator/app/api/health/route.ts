import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    agent: 'validator',
    status: 'healthy',
    version: '0.1.0',
    operations: ['verify', 'prove', 'status', 'demo'],
    supportedChains: ['ethereum', 'base', 'arc', 'avalanche'],
    attestationStandards: ['EAS', 'ERC-8004'],
  });
}
