'use client';

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
  type ReactNode,
} from 'react';
import type {
  SessionResponse,
  LoginResponse,
  AuthMethod,
} from '@signet/shared';
import type { SmartAccount, P256Credential } from '@signet/blockchain/circle';
import {
  initSignetCircle,
  registerPasskey,
  loginWithPasskey,
  createSmartAccount,
  serializeCredential,
  type SupportedChainId,
} from '@signet/blockchain/circle';
import { CSRF_HEADER_NAME, CHAIN_IDS } from '@signet/shared';

interface SignetAuthContextValue {
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  entityId: string | null;
  entityName: string | null;
  entityType: string | null;
  walletAddress: string | null;
  account: SmartAccount | null;
  csrfToken: string | null;
  authMethod: AuthMethod | null;
  registerIndividual: (username: string) => Promise<void>;
  loginWithPasskeyFn: () => Promise<void>;
  loginWithEntityId: (entityId: string) => Promise<void>;
  logout: () => Promise<void>;
  linkWallet: (walletAddress: string, roleName?: string) => Promise<void>;
}

const SignetAuthContext = createContext<SignetAuthContextValue | null>(null);

export function useSignetAuth(): SignetAuthContextValue {
  const ctx = useContext(SignetAuthContext);
  if (!ctx) {
    throw new Error('useSignetAuth must be used within <SignetAuthProvider>');
  }
  return ctx;
}

interface SignetAuthProviderProps {
  children: ReactNode;
}

export function SignetAuthProvider({ children }: SignetAuthProviderProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [session, setSession] = useState<SessionResponse>({ authenticated: false });
  const [account, setAccount] = useState<SmartAccount | null>(null);
  const [csrfToken, setCsrfToken] = useState<string | null>(null);
  const credentialRef = useRef<P256Credential | null>(null);
  const initializedRef = useRef(false);

  // Initialize Circle SDK on mount
  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    const clientUrl = process.env['NEXT_PUBLIC_CIRCLE_CLIENT_URL'] || '';
    const clientKey = process.env['NEXT_PUBLIC_CIRCLE_CLIENT_KEY'] || '';

    if (!clientUrl || !clientKey) {
      setError(
        'Circle SDK not configured. Set NEXT_PUBLIC_CIRCLE_CLIENT_URL and NEXT_PUBLIC_CIRCLE_CLIENT_KEY in .env.',
      );
      setIsLoading(false);
      return;
    }

    try {
      initSignetCircle(clientUrl, clientKey);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to initialize Circle SDK');
      setIsLoading(false);
      return;
    }

    // Check existing session
    fetch('/api/auth/session', { credentials: 'include' })
      .then((r) => r.json())
      .then((s: SessionResponse) => {
        setSession(s);
        setIsLoading(false);
      })
      .catch(() => {
        setIsLoading(false);
      });
  }, []);

  // Derive CSRF token from session (stored in cookie, fetched from login response)
  // For already-authenticated sessions, we need to get CSRF from a refresh
  const ensureCsrfToken = useCallback(async () => {
    if (csrfToken) return csrfToken;
    // Try to get a fresh CSRF token by calling session endpoint
    // The session cookie already has the CSRF token in a separate cookie
    // We read it from the login/login-passkey/register-passkey response
    return csrfToken;
  }, [csrfToken]);

  const registerIndividual = useCallback(
    async (username: string) => {
      setError(null);
      try {
        // Step 1: Circle passkey registration
        const credential = await registerPasskey(username);
        credentialRef.current = credential;

        // Step 2: Register on server
        const res = await fetch('/api/auth/register-passkey', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            username,
            credentialId: credential.id,
            publicKey: credential.publicKey,
          }),
        });

        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || 'Passkey registration failed');
        }

        const loginResp: LoginResponse = await res.json();
        setSession({
          authenticated: true,
          entityId: loginResp.entityId,
          entityName: loginResp.entityName,
          entityType: loginResp.entityType,
          walletAddress: loginResp.walletAddress,
        });
        setCsrfToken(loginResp.csrfToken);

        // Step 3: Create smart account
        const chainId: SupportedChainId = CHAIN_IDS.BASE_SEPOLIA;
        const smartAccount = await createSmartAccount(
          chainId,
          '/baseSepolia',
          credential,
          username,
        );
        setAccount(smartAccount);

        // Update entity walletAddress on server
        await fetch('/api/auth/link-wallet', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            [CSRF_HEADER_NAME]: loginResp.csrfToken,
          },
          credentials: 'include',
          body: JSON.stringify({
            entityId: loginResp.entityId,
            walletAddress: smartAccount.address,
            passkeyCredentialId: credential.id,
            passkeyPublicKey: credential.publicKey,
          }),
        }).catch(() => { /* non-blocking */ });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Passkey registration failed');
      }
    },
    [],
  );

  const loginWithPasskeyFn = useCallback(async () => {
    setError(null);
    try {
      // Step 1: Get challenge from server
      const challengeRes = await fetch('/api/auth/challenge', {
        method: 'POST',
        credentials: 'include',
      });
      const { challenge } = await challengeRes.json();

      // Step 2: Circle passkey login (WebAuthn.get)
      const credential = await loginWithPasskey();
      credentialRef.current = credential;

      // Extract WebAuthn response data from the credential
      // At runtime, P256Credential wraps a browser PublicKeyCredential
      const rawResp = (credential as unknown as { response: { authenticatorData: string; clientDataJSON: string; signature: string } }).response;

      // Step 3: Send assertion to server for verification
      const res = await fetch('/api/auth/login-passkey', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          credentialId: credential.id,
          authenticatorData: rawResp.authenticatorData,
          clientDataJSON: rawResp.clientDataJSON,
          signature: rawResp.signature,
          challenge,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Passkey login failed');
      }

      const loginResp: LoginResponse = await res.json();
      setSession({
        authenticated: true,
        entityId: loginResp.entityId,
        entityName: loginResp.entityName,
        entityType: loginResp.entityType,
        walletAddress: loginResp.walletAddress,
      });
      setCsrfToken(loginResp.csrfToken);

      // Step 4: Create smart account
      const chainId: SupportedChainId = CHAIN_IDS.BASE_SEPOLIA;
      const smartAccount = await createSmartAccount(
        chainId,
        '/baseSepolia',
        credential,
        loginResp.entityName || 'User',
      );
      setAccount(smartAccount);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Passkey login failed');
    }
  }, []);

  const loginWithEntityId = useCallback(async (entityId: string) => {
    setError(null);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          entityId,
          authMethod: 'entity_id',
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Login failed');
      }

      const loginResp: LoginResponse = await res.json();
      setSession({
        authenticated: true,
        entityId: loginResp.entityId,
        entityName: loginResp.entityName,
        entityType: loginResp.entityType,
        walletAddress: loginResp.walletAddress,
      });
      setCsrfToken(loginResp.csrfToken);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    } catch { /* ignore */ }
    setSession({ authenticated: false });
    setAccount(null);
    setCsrfToken(null);
    credentialRef.current = null;
    setError(null);
  }, []);

  const linkWallet = useCallback(
    async (walletAddress: string, roleName?: string) => {
      if (!session.entityId || !csrfToken) return;
      try {
        await fetch('/api/auth/link-wallet', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            [CSRF_HEADER_NAME]: csrfToken,
          },
          credentials: 'include',
          body: JSON.stringify({
            entityId: session.entityId,
            walletAddress,
            roleName,
          }),
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Wallet linking failed');
      }
    },
    [session.entityId, csrfToken],
  );

  return (
    <SignetAuthContext.Provider
      value={{
        isAuthenticated: session.authenticated,
        isLoading,
        error,
        entityId: session.entityId ?? null,
        entityName: session.entityName ?? null,
        entityType: session.entityType ?? null,
        walletAddress: session.walletAddress ?? null,
        account,
        csrfToken,
        authMethod: credentialRef.current ? 'passkey' : session.entityId ? 'entity_id' : null,
        registerIndividual,
        loginWithPasskeyFn,
        loginWithEntityId,
        logout,
        linkWallet,
      }}
    >
      {error && !session.authenticated && (
        <div className="bg-amber-900/20 border-b border-amber-500/20 px-4 py-2 text-center text-xs text-amber-400">
          {error}{' '}
          <a href="https://signet.ventures/docs/security" className="underline hover:text-amber-300">
            Learn more
          </a>
        </div>
      )}
      {isLoading && (
        <div className="bg-white/5 border-b border-white/5 px-4 py-2 text-center font-mono text-xs text-white/20">
          Initializing Signet...
        </div>
      )}
      {children}
    </SignetAuthContext.Provider>
  );
}