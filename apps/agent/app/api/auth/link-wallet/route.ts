// POST /api/auth/link-wallet — link a Circle Smart Account wallet to an existing entity
// Requires existing auth session. Used by organizations to add signing devices.

import { NextResponse } from 'next/server';
import { getSession, linkWalletToEntity } from '@/lib/auth';
import type { LinkWalletRequest, LinkWalletResponse } from '@signet/shared';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session.authenticated) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 },
      );
    }

    const body = (await request.json()) as LinkWalletRequest;

    if (!body.entityId || !body.walletAddress) {
      return NextResponse.json(
        { error: 'entityId and walletAddress are required' },
        { status: 400 },
      );
    }

    // Only the entity itself or an admin can link wallets
    if (body.entityId !== session.entityId) {
      return NextResponse.json(
        { error: 'You can only link wallets to your own entity' },
        { status: 403 },
      );
    }

    const result = await linkWalletToEntity(
      body.entityId,
      body.walletAddress,
      body.passkeyCredentialId,
      body.passkeyPublicKey,
      body.roleName,
      body.label,
    );

    const responseBody: LinkWalletResponse = {
      id: result.id,
      entityId: result.entityId,
      walletAddress: result.walletAddress,
      linked: true,
    };

    return NextResponse.json(responseBody, { status: 201 });
  } catch (error) {
    console.error('POST /api/auth/link-wallet error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}