// Auth types — session, JWT payload, login request/response, passkey auth

export type AuthMethod = 'passkey' | 'entity_id';

export interface JwtPayload {
  entityId: string;
  entityName: string;
  entityType: string;
  walletAddress: string | null;
  passkeyCredentialId?: string | null;
  iat?: number;
  exp?: number;
}

export interface LoginRequest {
  entityId?: string;
  authMethod: AuthMethod;
  passkeyCredentialId?: string;
}

export interface LoginResponse {
  entityId: string;
  entityName: string;
  entityType: string;
  walletAddress: string | null;
  csrfToken: string;
  expiresAt: string;
}

export interface SessionResponse {
  authenticated: boolean;
  entityId?: string;
  entityName?: string;
  entityType?: string;
  walletAddress?: string | null;
  passkeyCredentialId?: string | null;
}

// Passkey registration — client sends credential proof, server creates session
export interface PasskeyRegisterRequest {
  username: string;
  credentialId: string;       // base64url-encoded
  publicKey: string;          // base64url-encoded raw public key
  attestationObject?: string; // base64url (optional for demo, required for prod)
}

export interface PasskeyLoginRequest {
  credentialId: string;
  authenticatorData: string;  // base64url
  clientDataJSON: string;     // base64url
  signature: string;          // base64url
  challenge: string;          // the server-issued challenge this signature was created against
}

export interface PasskeyChallengeResponse {
  challenge: string;          // base64url random 32 bytes
  expiresAt: string;          // ISO 8601, 5 minute expiry
}

// Entity wallet linking — for org accounts
export interface LinkWalletRequest {
  entityId: string;
  walletAddress: string;      // 0x-prefixed smart account address
  passkeyCredentialId?: string;
  passkeyPublicKey?: string;
  roleName?: string;          // e.g., "CEO", "Notary Public", "Board Secretary"
  label?: string;
}

export interface LinkWalletResponse {
  id: string;
  entityId: string;
  walletAddress: string;
  linked: boolean;
}

export const AUTH_COOKIE_NAME = 'signet_session';
export const CSRF_COOKIE_NAME = 'signet_csrf';
export const CSRF_HEADER_NAME = 'X-CSRF-Token';
export const PASSKEY_CHALLENGE_COOKIE = 'signet_challenge';
export const SESSION_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours (demo)
export const PASSKEY_CHALLENGE_TTL_MS = 5 * 60 * 1000; // 5 minutes
