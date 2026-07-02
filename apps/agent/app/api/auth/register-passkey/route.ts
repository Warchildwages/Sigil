// POST /api/auth/register-passkey — register a new passkey, auto-provision individual entity, create session

import { NextResponse } from 'next/server';
import { createEntityFromPasskey, createSessionToken, setSessionCookie, verifyChallenge } from '@/lib/auth';
import { CSRF_COOKIE_NAME } from '@sigil/shared';
import type { PasskeyRegisterRequest, LoginResponse } from '@sigil/shared';

export const dynamic = 'force-dynamic';

function generateCSRFToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as PasskeyRegisterRequest;

    if (!body.username || !body.credentialId || !body.publicKey) {
      return NextResponse.json(
        { error: 'username, credentialId, and publicKey are required' },
        { status: 400 },
      );
    }

    // Auto-provision entity from passkey
    const entity = await createEntityFromPasskey(
      body.credentialId,
      body.publicKey,
      body.username,
    );

    // Create JWT session
    const token = await createSessionToken({
      entityId: entity.id,
      entityName: entity.name,
      entityType: entity.type,
      walletAddress: entity.walletAddress,
      passkeyCredentialId: entity.passkeyCredentialId,
    });

    await setSessionCookie(token);

    const csrfToken = generateCSRFToken();

    const responseBody: LoginResponse = {
      entityId: entity.id,
      entityName: entity.name,
      entityType: entity.type,
      walletAddress: entity.walletAddress,
      csrfToken,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    };

    const response = NextResponse.json(responseBody, { status: 201 });

    response.cookies.set(CSRF_COOKIE_NAME, csrfToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: 24 * 60 * 60,
    });

    return response;
  } catch (error) {
    console.error('POST /api/auth/register-passkey error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}