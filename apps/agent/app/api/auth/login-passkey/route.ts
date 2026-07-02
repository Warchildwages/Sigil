// POST /api/auth/login-passkey — login with an existing passkey (WebAuthn assertion)

import { NextResponse } from 'next/server';
import { prisma } from '@signet/db';
import {
  createSessionToken,
  setSessionCookie,
  verifyChallenge,
  verifyPasskeyAssertion,
} from '@/lib/auth';
import { CSRF_COOKIE_NAME } from '@signet/shared';
import type { PasskeyLoginRequest, LoginResponse } from '@signet/shared';

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
    const body = (await request.json()) as PasskeyLoginRequest;

    if (!body.credentialId || !body.signature || !body.authenticatorData || !body.clientDataJSON || !body.challenge) {
      return NextResponse.json(
        { error: 'credentialId, signature, authenticatorData, clientDataJSON, and challenge are required' },
        { status: 400 },
      );
    }

    // Verify the challenge
    const challengeValid = await verifyChallenge(body.challenge);
    if (!challengeValid) {
      return NextResponse.json(
        { error: 'Invalid or expired challenge. Please request a new challenge.' },
        { status: 400 },
      );
    }

    // Find entity by passkey credential ID
    const entity = await prisma.entity.findFirst({
      where: { passkeyCredentialId: body.credentialId },
    });

    if (!entity || !entity.passkeyPublicKey) {
      return NextResponse.json(
        { error: 'Passkey not found. Please register first.' },
        { status: 401 },
      );
    }

    // Verify WebAuthn assertion signature
    const valid = await verifyPasskeyAssertion(
      body.credentialId,
      body.signature,
      body.authenticatorData,
      body.clientDataJSON,
      body.challenge,
      entity.passkeyPublicKey,
    );

    if (!valid) {
      return NextResponse.json(
        { error: 'Invalid passkey signature. Please try again.' },
        { status: 401 },
      );
    }

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

    const response = NextResponse.json(responseBody, { status: 200 });

    response.cookies.set(CSRF_COOKIE_NAME, csrfToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: 24 * 60 * 60,
    });

    return response;
  } catch (error) {
    console.error('POST /api/auth/login-passkey error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}