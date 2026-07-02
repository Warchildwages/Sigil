// POST /api/auth/challenge — issue a WebAuthn challenge for passkey registration or login
// Stores challenge in httpOnly cookie (5 min TTL).

import { NextResponse } from 'next/server';
import { generateChallenge } from '@/lib/auth';
import { PASSKEY_CHALLENGE_TTL_MS } from '@signet/shared';

export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    const challenge = await generateChallenge();

    return NextResponse.json(
      {
        challenge,
        expiresAt: new Date(Date.now() + PASSKEY_CHALLENGE_TTL_MS).toISOString(),
      },
      { status: 200 },
    );
  } catch (error) {
    console.error('POST /api/auth/challenge error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}