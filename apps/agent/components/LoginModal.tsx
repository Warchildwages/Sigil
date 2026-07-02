'use client';

import { useSignetAuth } from '@/components/SignetAuthProvider';
import { useState } from 'react';

interface LoginModalProps {
  onClose?: () => void;
}

export function LoginModal({ onClose }: LoginModalProps) {
  const { loginWithEntityId, loginWithPasskeyFn, error, isAuthenticated, entityName } =
    useSignetAuth();
  const [entityId, setEntityId] = useState('');
  const [loading, setLoading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleEntityLogin = async () => {
    if (!entityId.trim()) {
      setLocalError('Enter an entity ID to continue');
      return;
    }
    setLoading(true);
    setLocalError(null);
    try {
      await loginWithEntityId(entityId.trim());
      setSuccess(true);
      setTimeout(() => onClose?.(), 800);
    } catch {
      setLocalError('Login failed. Try again.');
    } finally {
      setLoading(false);
    }
  };

  const handlePasskeyLogin = async () => {
    setLoading(true);
    setLocalError(null);
    try {
      await loginWithPasskeyFn();
      setSuccess(true);
      setTimeout(() => onClose?.(), 800);
    } catch {
      setLocalError('Passkey login failed. Try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md signet-card space-y-6 p-8">
        <div className="text-center">
          <h2 className="font-sans text-xl font-light text-white/90">Welcome to Signet</h2>
          <p className="mt-1 font-mono text-xs text-white/40">The chain is the witness</p>
        </div>

        {success ? (
          <div className="rounded-lg border border-green-500/20 bg-green-500/5 px-4 py-3 text-center">
            <p className="font-mono text-sm text-green-400/80">
              Signed in as {entityName || 'user'}
            </p>
          </div>
        ) : localError || error ? (
          <div className="rounded-lg border border-red-500/20 bg-red-500/5 px-4 py-3 font-mono text-xs text-red-400/60">
            {localError || error}
          </div>
        ) : null}

        <div className="space-y-4">
          {/* Passkey Login */}
          <button
            onClick={handlePasskeyLogin}
            disabled={loading || success}
            className="w-full rounded-lg bg-white/10 px-4 py-4 text-left transition hover:bg-white/20 disabled:opacity-50"
          >
            <div className="font-mono text-sm text-white/80">🔑 Sign in with Passkey</div>
            <div className="mt-1 font-mono text-xs text-white/30">
              Use your fingerprint, face, or device PIN
            </div>
          </button>

          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-white/10" />
            <span className="font-mono text-xs text-white/20">or</span>
            <div className="h-px flex-1 bg-white/10" />
          </div>

          {/* Entity ID Login */}
          <div className="space-y-2">
            <input
              type="text"
              value={entityId}
              onChange={(e) => setEntityId(e.target.value)}
              placeholder="Enter entity ID..."
              onKeyDown={(e) => e.key === 'Enter' && handleEntityLogin()}
              className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 font-mono text-sm text-white/80 placeholder:text-white/20 focus:border-white/30 focus:outline-none"
              autoFocus
            />
            <button
              onClick={handleEntityLogin}
              disabled={loading}
              className="w-full rounded-lg bg-white/5 px-4 py-3 font-mono text-sm text-white/60 transition hover:bg-white/10 disabled:opacity-50"
            >
              {loading ? 'Signing in...' : 'Sign in with Entity ID'}
            </button>
          </div>
        </div>

        <p className="font-mono text-[10px] text-center text-white/10">
          Organizations: use entity ID. Individuals: use passkey.
        </p>
      </div>
    </div>
  );
}
