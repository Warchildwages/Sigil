'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { initSignetCircle } from '@sigil/blockchain/circle';

interface CircleProviderProps {
  children: ReactNode;
}

export function CircleProvider({ children }: CircleProviderProps) {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const clientUrl =
      process.env['NEXT_PUBLIC_CIRCLE_CLIENT_URL'] || '';
    const clientKey =
      process.env['NEXT_PUBLIC_CIRCLE_CLIENT_KEY'] || '';

    if (!clientUrl || !clientKey) {
      setError(
        'Circle SDK not configured. Set NEXT_PUBLIC_CIRCLE_CLIENT_URL and NEXT_PUBLIC_CIRCLE_CLIENT_KEY in .env.',
      );
      return;
    }

    try {
      initSignetCircle(clientUrl, clientKey);
      setReady(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to initialize Circle SDK');
    }
  }, []);

  return (
    <>
      {error && (
        <div className="bg-amber-900/20 border-b border-amber-500/20 px-4 py-2 text-center text-xs text-amber-400">
          🔐 Enhanced security features unavailable — your document can still be signed with standard guarantees.{" "}
          <a href="https://signet.ventures/docs/security" className="underline hover:text-amber-300">Learn more</a>
        </div>
      )}
      {!ready && !error && (
        <div className="bg-white/5 border-b border-white/5 px-4 py-2 text-center font-mono text-xs text-white/20">
          Initializing Circle SDK...
        </div>
      )}
      {children}
    </>
  );
}