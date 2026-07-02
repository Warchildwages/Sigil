// POST /api/auth/login — create a session for an entity
// In Phase 2, entities are looked up by ID. Passkey WebAuthn (Circle) is the real auth layer.
// This login endpoint bridges the passkey-to-session gap.

import { NextResponse } from 'next/server';
import { prisma } from '@sigil/db';
import { createSessionToken, setSessionCookie } from '@/lib/auth';
import { CSRF_COOKIE_NAME } from '@sigil/shared';
import type { LoginRequest, LoginResponse } from '@sigil/shared';

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
    const { entityId } = (await request.json()) as LoginRequest;

    if (!entityId || typeof entityId !== 'string') {
      return NextResponse.json(
        { error: 'entityId is required' },
        { status: 400 },
      );
    }

    // Auto-provision entity for demo — Phase 2 pattern
    let entity = await prisma.entity.findUnique({
      where: { id: entityId },
    });

    if (!entity) {
      const typeFromId = (id: string): { name: string; type: 'individual' | 'corporation' | 'government_agency' } => {
        if (id.includes('government')) return { name: 'Demo Government Agency', type: 'government_agency' };
        if (id.includes('business') || id.includes('corp')) return { name: 'Demo Business Corp', type: 'corporation' };
        if (id.includes('notary')) return { name: 'Demo Notary Public', type: 'individual' };
        if (id.includes('agent')) return { name: 'Demo AI Notary Agent', type: 'individual' };
        return { name: 'Demo Individual', type: 'individual' };
      };

      const derived = typeFromId(entityId);

      entity = await prisma.entity.create({
        data: {
          id: entityId,
          name: derived.name,
          type: derived.type,
          walletAddress: entityId.startsWith('0x') ? entityId : null,
        },
      });
    }

    const token = await createSessionToken({
      entityId: entity.id,
      entityName: entity.name,
      entityType: entity.type,
      walletAddress: entity.walletAddress,
    });

    await setSessionCookie(token);

    // Generate CSRF token for state-changing requests
    const csrfToken = generateCSRFToken();

    const body: LoginResponse = {
      entityId: entity.id,
      entityName: entity.name,
      entityType: entity.type,
      walletAddress: entity.walletAddress,
      csrfToken,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    };

    const response = NextResponse.json(body, { status: 200 });

    // Set CSRF token as httpOnly, SameSite=Strict cookie
    response.cookies.set(CSRF_COOKIE_NAME, csrfToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: 24 * 60 * 60, // 24 hours (same as session)
    });

    return response;
  } catch (error) {
    console.error('POST /api/auth/login error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}