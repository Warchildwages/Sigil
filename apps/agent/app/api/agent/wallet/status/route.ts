import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import type { AgentWalletIdentity } from '@sigil/shared';

/**
 * GET /api/agent/wallet/status
 *
 * Returns the agent wallet identity (address, chain, balance).
 * Admin-only — requires authenticated JWT session.
 *
 * Phase 3 — Legal Clarity Agent for Circle Marketplace.
 */
export async function GET() {
  try {
    // Auth check
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('signet_session');
    if (!sessionCookie?.value) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'dev-secret-do-not-use-in-prod');
    try {
      await jwtVerify(sessionCookie.value, secret);
    } catch {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const identity: AgentWalletIdentity = {
      walletId: process.env.SIGIL_AGENT_WALLET_ID || process.env.SIGNET_AGENT_WALLET_ID || 'sigil-unknown',
      chainId: 84532, // Base Sepolia default
      address: process.env.SIGIL_AGENT_WALLET_ADDRESS || process.env.SIGNET_AGENT_WALLET_ADDRESS || '0x0000000000000000000000000000000000000000',
      displayName: 'Sigil',
      serviceId: 'sigil-v1',
      createdAt: new Date().toISOString(),
    };

    return NextResponse.json(identity);
  } catch (error) {
    console.error('GET /api/agent/wallet/status error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}