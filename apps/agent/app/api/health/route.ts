import { NextResponse } from 'next/server';
import { prisma } from '@sigil/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  const checks: Record<string, { status: string; error?: string }> = {};

  // Self check
  checks.self = { status: 'ok' };

  // Database check
  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.database = { status: 'ok' };
  } catch (err) {
    checks.database = { status: 'error', error: err instanceof Error ? err.message : 'Unknown error' };
  }

  // CSPR.cloud facilitator check
  const csprUrl = process.env.CSPR_CLOUD_FACILITATOR || 'https://x402-facilitator.cspr.cloud';
  try {
    const res = await fetch(`${csprUrl}/health`, { signal: AbortSignal.timeout(5000) });
    checks.cspr_cloud = { status: res.ok ? 'ok' : `error (${res.status})` };
  } catch (err) {
    checks.cspr_cloud = { status: 'unreachable', error: err instanceof Error ? err.message : 'unknown' };
  }

  // Casper RPC check
  const casperRpc = process.env.CASPER_RPC_URL || 'https://rpc.testnet.casper.network';
  try {
    const res = await fetch(casperRpc, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'chain_get_state_root_hash',
        params: [],
      }),
      signal: AbortSignal.timeout(5000),
    });
    checks.casper_rpc = { status: res.ok ? 'ok' : `error (${res.status})` };
  } catch (err) {
    checks.casper_rpc = { status: 'unreachable', error: err instanceof Error ? err.message : 'unknown' };
  }

  const allOk = Object.values(checks).every((c) => c.status === 'ok');

  return NextResponse.json({
    status: allOk ? 'ok' : 'degraded',
    service: 'sigil',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    checks,
  }, {
    status: allOk ? 200 : 503,
    headers: { 'Cache-Control': 'no-store' },
  });
}
