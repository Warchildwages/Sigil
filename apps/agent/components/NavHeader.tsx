'use client';

import { LoginModal } from '@/components/LoginModal';
import { useSignetAuth } from '@/components/SignetAuthProvider';
import Link from 'next/link';
import { useState } from 'react';

export function NavHeader() {
  const { isAuthenticated, isLoading, entityName, logout } = useSignetAuth();
  const [showLogin, setShowLogin] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  return (
    <>
      <nav className="sticky top-0 z-40 border-b border-white/10 bg-black/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          {/* Logo / Home */}
          <Link href="/" className="flex items-center gap-2 group">
            <div className="flex h-8 w-8 items-center justify-center rounded-full border border-white/15 bg-white/5 group-hover:border-amber-500/30 transition-colors">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                className="text-white/40 group-hover:text-amber-400 transition-colors"
              >
                <circle cx="12" cy="12" r="10" />
                <circle cx="12" cy="12" r="6" />
                <circle cx="12" cy="12" r="2" />
              </svg>
            </div>
            <span className="font-mono text-xs tracking-[0.2em] text-white/30 group-hover:text-white/50 transition-colors uppercase">
              Signet
            </span>
          </Link>

          {/* Right side */}
          <div className="flex items-center gap-3">
            {isLoading ? (
              <div className="h-5 w-20 animate-pulse rounded bg-white/10" />
            ) : isAuthenticated ? (
              <>
                {/* My Account button */}
                <Link
                  href="/account"
                  className="hidden sm:inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-1.5 font-mono text-xs text-white/50 transition hover:border-amber-500/30 hover:text-white/80"
                >
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-green-500" />
                  {entityName || 'My Account'}
                </Link>

                {/* Mobile menu toggle */}
                <button
                  onClick={() => setShowMenu(!showMenu)}
                  className="sm:hidden rounded-lg border border-white/10 bg-white/[0.03] px-3 py-1.5 font-mono text-xs text-white/50"
                >
                  {entityName?.slice(0, 12) || 'Menu'}
                </button>

                {/* Logout button */}
                <button
                  onClick={() => logout()}
                  className="hidden sm:inline-flex rounded-lg border border-white/5 bg-transparent px-3 py-1.5 font-mono text-xs text-white/25 transition hover:border-red-500/20 hover:text-red-400/60"
                >
                  Sign Out
                </button>
              </>
            ) : (
              <button
                onClick={() => setShowLogin(true)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-amber-500/20 bg-amber-500/5 px-4 py-1.5 font-mono text-xs text-amber-400/80 transition hover:border-amber-500/40 hover:bg-amber-500/10"
              >
                Sign In
              </button>
            )}
          </div>
        </div>

        {/* Mobile dropdown menu */}
        {showMenu && isAuthenticated && (
          <div className="border-t border-white/10 px-4 py-3 sm:hidden">
            <div className="space-y-2">
              <Link
                href="/account"
                onClick={() => setShowMenu(false)}
                className="block rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 font-mono text-xs text-white/60 hover:border-amber-500/30"
              >
                📊 My Account
              </Link>
              <Link
                href="/review"
                onClick={() => setShowMenu(false)}
                className="block rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 font-mono text-xs text-white/60 hover:border-amber-500/30"
              >
                📄 Review a Document
              </Link>
              <button
                onClick={() => {
                  logout();
                  setShowMenu(false);
                }}
                className="block w-full text-left rounded-lg border border-red-500/10 bg-red-500/[0.02] px-3 py-2 font-mono text-xs text-red-400/50 hover:border-red-500/30"
              >
                🚪 Sign Out
              </button>
            </div>
          </div>
        )}
      </nav>

      {/* Login modal */}
      {showLogin && <LoginModal onClose={() => setShowLogin(false)} />}
    </>
  );
}
