import Link from 'next/link';
import { FeedbackBox } from '@/components/FeedbackBox';

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center px-4 py-16 sm:py-24">
      {/* ── Hero (with subtle gradient animation) ── */}
      <div className="signet-card max-w-3xl text-center relative overflow-hidden">
        {/* Subtle gradient background animation */}
        <div className="absolute inset-0 bg-gradient-to-br from-amber-500/[0.02] via-transparent to-white/[0.02] animate-hero-gradient" />
        <div className="relative">
          {/* Seal */}
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full border border-white/15 bg-white/5">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-white/50">
              <circle cx="12" cy="12" r="10" />
              <circle cx="12" cy="12" r="6" />
              <circle cx="12" cy="12" r="2" />
              <path d="M12 2v4M12 18v4M2 12h4M18 12h4" />
            </svg>
          </div>

          <h1 className="mb-2 font-mono text-sm tracking-[0.3em] text-white/40 uppercase">Signet</h1>
          <h2 className="mb-4 font-sans text-4xl font-light leading-tight tracking-tight sm:text-5xl">
            The Chain Is The Witness
          </h2>

          <p className="mx-auto mb-6 max-w-xl text-base leading-relaxed text-white/50">
            Permanent, verifiable attestations for the documents that matter.
            From personal records to institutional acts —
            <strong className="text-white/80"> one platform, onchain.</strong>
          </p>

           {/* CTA */}
          <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <div className="flex flex-col sm:flex-row gap-3">
              <Link
                href="/review"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-8 py-3 font-medium text-black transition hover:bg-white/90"
              >
                Review a Document
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M6 4l4 4-4 4" />
                </svg>
              </Link>
              <Link
                href="/agent"
                className="inline-flex items-center justify-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-8 py-3 font-medium text-amber-400 transition hover:border-amber-500/50 hover:bg-amber-500/20"
              >
                Ask Legal Clarity Agent
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M6 4l4 4-4 4" />
                </svg>
              </Link>
            </div>
          </div>

          {/* Bootstrapped via AllFans */}
          <p className="mt-5 font-mono text-xs text-white/20">
            ⚡ Bootstrapped through <span className="text-white/40">AllFans</span> — live, onchain, at real events
          </p>
        </div>
      </div>

      {/* ── Chain Badges (liquid glass) ── */}
      <div className="mt-12 flex flex-wrap items-center justify-center gap-3">
        <span className="rounded-lg border border-white/10 bg-white/5 px-4 py-1.5 font-mono text-xs text-white/40 backdrop-blur-sm">
          Base
        </span>
        <span className="rounded-lg border border-white/10 bg-white/5 px-4 py-1.5 font-mono text-xs text-white/40 backdrop-blur-sm">
          Arc (on launch)
        </span>
        <span className="rounded-lg border border-white/10 bg-white/5 px-4 py-1.5 font-mono text-xs text-white/40 backdrop-blur-sm">
          Avalanche (planned)
        </span>
      </div>

      {/* ── Who It's For ── */}
      <div className="mt-16 max-w-4xl">
        <h3 className="mb-6 text-center font-mono text-xs tracking-[0.15em] text-white/30 uppercase">
          Built for every official act
        </h3>
        <div className="grid gap-4 sm:grid-cols-2">
          {/* Individual */}
          <div className="rounded-xl border border-white/10 bg-white/[0.04] p-5 backdrop-blur-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-amber-500/30 hover:shadow-[0_0_20px_rgba(201,165,90,0.06)]">
            <div className="mb-2 flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/10 font-mono text-xs text-white/50">👤</span>
              <span className="font-mono text-xs tracking-wider text-white/50 uppercase">For Individuals</span>
            </div>
            <p className="text-sm text-white/60">
              Wills, powers of attorney, deeds. A permanent record your family can always find.
              <strong className="text-white/80"> One tap to sign. On-chain forever.</strong>
            </p>
          </div>

          {/* Notary */}
          <div className="rounded-xl border border-white/10 bg-white/[0.04] p-5 backdrop-blur-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-amber-500/30 hover:shadow-[0_0_20px_rgba(201,165,90,0.06)]">
            <div className="mb-2 flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/10 font-mono text-xs text-white/50">📜</span>
              <span className="font-mono text-xs tracking-wider text-white/50 uppercase">For Notaries</span>
            </div>
            <p className="text-sm text-white/60">
              Replace your paper journal. <strong className="text-white/80">Never lost. Always verifiable.</strong>
              Your blockchain journal connects to colleagues on the same platform.
            </p>
          </div>

          {/* Business */}
          <div className="rounded-xl border border-white/10 bg-white/[0.04] p-5 backdrop-blur-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-amber-500/30 hover:shadow-[0_0_20px_rgba(201,165,90,0.06)]">
            <div className="mb-2 flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/10 font-mono text-xs text-white/50">🏢</span>
              <span className="font-mono text-xs tracking-wider text-white/50 uppercase">For Businesses</span>
            </div>
            <p className="text-sm text-white/60">
              Board resolutions, vendor contracts, NDAs.
              <strong className="text-white/80"> Auditable governance on-chain.</strong> Survives every personnel change.
            </p>
          </div>

          {/* Government — Coming Phase 4 */}
          <div className="rounded-xl border border-white/10 bg-white/[0.04] p-5 backdrop-blur-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-amber-500/30 hover:shadow-[0_0_20px_rgba(201,165,90,0.06)] opacity-70">
            <div className="mb-2 flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/10 font-mono text-xs text-white/50">🏛️</span>
              <span className="font-mono text-xs tracking-wider text-white/50 uppercase">For Government</span>
              <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 font-mono text-[10px] text-amber-400">Phase 4</span>
            </div>
            <p className="text-sm text-white/60">
              Executive orders, permits, MOUs. Institutional memory that survives every transition.
              <strong className="text-white/80"> Coming when Kohaku privacy + Ethereum L1 are live.</strong>
            </p>
          </div>
        </div>
      </div>

      {/* ── Live Counter ── */}
      <div className="mt-10 text-center">
        <p className="font-mono text-xs text-white/30">
          Documents attested on Base Sepolia:{" "}
          <span className="text-white/60">1,247+</span>
        </p>
      </div>

      {/* ── How It Works ── */}
      <div className="mt-16 max-w-2xl">
        <h3 className="mb-6 text-center font-mono text-xs tracking-[0.15em] text-white/30 uppercase">
          How It Works
        </h3>
        <div className="signet-card">
          <ol className="space-y-3">
            {[
              ['Create', 'Draft a document — will, contract, executive order'],
              ['Sign', 'Wallet-attested. One tap via passkey. Role-based signing.'],
              ['Attest', 'Permanent on-chain record via EAS on Base.'],
              ['Verify', 'Anyone can verify. The chain is the witness. Forever.'],
            ].map(([step, desc], i) => (
              <li key={step} className="flex gap-4">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/10 font-mono text-xs text-white/50">
                  {i + 1}
                </span>
                <div>
                  <span className="font-medium text-white/80">{step}</span>
                  <span className="text-white/40"> — {desc}</span>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>

      {/* ── Feedback ── */}
      <div className="mt-12 w-full max-w-2xl">
        <FeedbackBox pageUrl="/" />
      </div>

      {/* ── Footer ── */}
      <div className="mt-12 text-center">
        <p className="font-mono text-xs text-white/15">
          Phase 1 — Demo Live · Bootstrapped via AllFans
        </p>
        <p className="mt-1 font-mono text-[11px] text-white/10">
          Base (EAS) + Arc (Payments) + Circle (Wallets)
        </p>
      </div>
    </main>
  );
}