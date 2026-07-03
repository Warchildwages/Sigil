import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    agent: 'Vera',
    role: 'Agent Trust Authority — Casper Registry Agent',
    status: 'healthy',
    version: '0.1.0',
    operations: ['discover', 'evaluate', 'query', 'report'],
    agents: {
      discovered: 3,
      verified: 2,
      flagged: 1,
    },
    uptime: process.uptime(),
  });
}
