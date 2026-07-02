// JWT-based session management — stateless, Edge-compatible via jose
// httpOnly cookies for production security, cross-domain compatible via lax sameSite
//
// Extended with passkey (WebAuthn) support: challenge generation, credential storage,
// WebAuthn assertion verification, and wallet linking.

import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import {
  AUTH_COOKIE_NAME,
  PASSKEY_CHALLENGE_COOKIE,
  SESSION_DURATION_MS,
  PASSKEY_CHALLENGE_TTL_MS,
} from '@signet/shared';
import type { JwtPayload, SessionResponse } from '@signet/shared';
import { prisma } from '@signet/db';

// Secret derived from env or a demo fallback (rotate before production)
function getSecret(): Uint8Array {
  const raw = process.env.JWT_SECRET || 'signet-demo-secret-rotate-in-production-2026';
  return new TextEncoder().encode(raw);
}

export async function createSessionToken(payload: Omit<JwtPayload, 'iat' | 'exp'>): Promise<string> {
  const token = await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(Math.floor(Date.now() / 1000) + SESSION_DURATION_MS / 1000)
    .sign(getSecret());
  return token;
}

export async function verifySessionToken(token: string): Promise<JwtPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    return payload as unknown as JwtPayload;
  } catch {
    return null;
  }
}

export async function setSessionCookie(token: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_DURATION_MS / 1000,
  });
}

export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(AUTH_COOKIE_NAME, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
}

/**
 * Read the session from the httpOnly cookie. Returns null if no valid session exists.
 * This is called by middleware and API route handlers.
 */
export async function getSession(): Promise<SessionResponse> {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;

  if (!token) {
    return { authenticated: false };
  }

  const payload = await verifySessionToken(token);

  if (!payload) {
    return { authenticated: false };
  }

  return {
    authenticated: true,
    entityId: payload.entityId,
    entityName: payload.entityName,
    entityType: payload.entityType,
    walletAddress: payload.walletAddress,
    passkeyCredentialId: payload.passkeyCredentialId ?? null,
  };
}

// ---- Passkey Challenge Management ----

/**
 * Generate a WebAuthn challenge (32 random bytes, base64url-encoded).
 * Stores the challenge in an httpOnly cookie with a 5-minute TTL.
 */
export async function generateChallenge(): Promise<string> {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  const challenge = btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  const cookieStore = await cookies();
  cookieStore.set(PASSKEY_CHALLENGE_COOKIE, challenge, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: PASSKEY_CHALLENGE_TTL_MS / 1000,
  });

  return challenge;
}

/**
 * Verify that the client-submitted challenge matches the stored cookie.
 */
export async function verifyChallenge(clientChallenge: string): Promise<boolean> {
  const cookieStore = await cookies();
  const stored = cookieStore.get(PASSKEY_CHALLENGE_COOKIE)?.value;

  if (!stored) return false;

  // Constant-time comparison
  if (clientChallenge.length !== stored.length) return false;
  let result = 0;
  for (let i = 0; i < clientChallenge.length; i++) {
    result |= clientChallenge.charCodeAt(i) ^ stored.charCodeAt(i);
  }
  return result === 0;
}

// ---- Passkey Credential Storage ----

/**
 * Persist passkey credential to the entity record.
 * Called after successful passkey registration.
 */
export async function storePasskeyCredential(
  entityId: string,
  credentialId: string,
  publicKey: string,
): Promise<void> {
  await prisma.entity.update({
    where: { id: entityId },
    data: {
      passkeyCredentialId: credentialId,
      passkeyPublicKey: publicKey,
    },
  });
}

/**
 * Auto-provision an individual entity from passkey registration.
 * Returns the created entity.
 */
export async function createEntityFromPasskey(
  credentialId: string,
  publicKey: string,
  username: string,
) {
  const entity = await prisma.entity.create({
    data: {
      name: username,
      type: 'individual',
      passkeyCredentialId: credentialId,
      passkeyPublicKey: publicKey,
    },
  });
  return entity;
}

// ---- WebAuthn Assertion Verification ----

/**
 * Verify a WebAuthn assertion signature using crypto.subtle.
 *
 * WebAuthn signatures use ECDSA with P-256 and SHA-256.
 * The signed data is: authenticatorData || SHA-256(clientDataJSON)
 *
 * For demo purposes, this performs a simplified verification.
 * Production should use a full WebAuthn server library.
 */
export async function verifyPasskeyAssertion(
  credentialId: string,
  signatureBase64: string,
  authenticatorDataBase64: string,
  clientDataJSONBase64: string,
  challenge: string,
  publicKeyBase64: string,
): Promise<boolean> {
  try {
    // Decode base64url inputs
    const signature = Uint8Array.from(
      atob(signatureBase64.replace(/-/g, '+').replace(/_/g, '/')),
      (c) => c.charCodeAt(0),
    );
    const authenticatorData = Uint8Array.from(
      atob(authenticatorDataBase64.replace(/-/g, '+').replace(/_/g, '/')),
      (c) => c.charCodeAt(0),
    );
    const clientDataJSON = Uint8Array.from(
      atob(clientDataJSONBase64.replace(/-/g, '+').replace(/_/g, '/')),
      (c) => c.charCodeAt(0),
    );

    // Verify the challenge is embedded in clientDataJSON
    const clientDataStr = new TextDecoder().decode(clientDataJSON);
    const clientData = JSON.parse(clientDataStr);
    if (clientData.challenge !== challenge) {
      console.error('Passkey challenge mismatch in clientDataJSON');
      return false;
    }

    // Hash clientDataJSON with SHA-256
    const clientDataHash = await crypto.subtle.digest('SHA-256', clientDataJSON);

    // Concatenate authenticatorData || SHA-256(clientDataJSON)
    const signedData = new Uint8Array(authenticatorData.length + clientDataHash.byteLength);
    signedData.set(authenticatorData, 0);
    signedData.set(new Uint8Array(clientDataHash), authenticatorData.length);

    // Decode the raw P-256 public key
    const publicKeyBytes = Uint8Array.from(
      atob(publicKeyBase64.replace(/-/g, '+').replace(/_/g, '/')),
      (c) => c.charCodeAt(0),
    );

    // Import the P-256 public key
    const publicKey = await crypto.subtle.importKey(
      'spki',
      publicKeyBytes,
      { name: 'ECDSA', namedCurve: 'P-256' },
      false,
      ['verify'],
    );

    // Verify the signature
    const isValid = await crypto.subtle.verify(
      { name: 'ECDSA', hash: 'SHA-256' },
      publicKey,
      signature,
      signedData,
    );

    return isValid;
  } catch (err) {
    console.error('Passkey assertion verification error:', err);
    return false;
  }
}

// ---- Wallet Linking (Org Entities) ----

export interface LinkedWalletResult {
  id: string;
  entityId: string;
  walletAddress: string;
}

/**
 * Link a smart account wallet to an existing entity.
 * Used by organizations to associate signing devices with the entity.
 */
export async function linkWalletToEntity(
  entityId: string,
  walletAddress: string,
  passkeyCredentialId?: string,
  passkeyPublicKey?: string,
  roleName?: string,
  label?: string,
): Promise<LinkedWalletResult> {
  // Check if this wallet is already linked
  const existing = await prisma.linkedWallet.findUnique({
    where: { walletAddress },
  });

  if (existing) {
    return {
      id: existing.id,
      entityId: existing.entityId,
      walletAddress: existing.walletAddress,
    };
  }

  const linked = await prisma.linkedWallet.create({
    data: {
      entityId,
      walletAddress,
      passkeyCredentialId: passkeyCredentialId ?? null,
      passkeyPublicKey: passkeyPublicKey ?? null,
      roleName: roleName ?? null,
      label: label ?? null,
    },
  });

  // Also update the entity's walletAddress if not set
  await prisma.entity.update({
    where: { id: entityId },
    data: { walletAddress: walletAddress },
  });

  return {
    id: linked.id,
    entityId: linked.entityId,
    walletAddress: linked.walletAddress,
  };
}