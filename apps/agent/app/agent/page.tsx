'use client';

import { AgentChat } from '@/components/AgentChat';
import type { AgentStatusResponse } from '@sigil/shared';
import Link from 'next/link';
import { useEffect, useState } from 'react';

interface AgentStatus {
  address: string;
  chain: string;
  balanceUSDC: string;
  attested: boolean;
  agentId?: string;
  creatorAddress?: string;
  attestationUid?: string;
  registeredAt?: string;
  x402Listed: boolean;
  serviceId: string;
  pricing: Record<string, number>;
  uptime: string;
  version: string;
}

const DEFAULT_STATUS: AgentStatus = {
  address: '0x...',
  chain: 'base',
  balanceUSDC: '0.00',
  attested: false,
  x402Listed: false,
  serviceId: 'sigil-v1',
  pricing: { analyze: 1.0, knowledge: 0.5 },
  uptime: 'loading...',
  version: '1.0.0',
};

export default function AgentPage() {
  const [status, setStatus] = useState<AgentStatus>(DEFAULT_STATUS);
  const [statusLoading, setStatusLoading] = useState(true);

  useEffect(() => {
    async function fetchStatus() {
      try {
        const res = await fetch('/api/agent/status');
        if (res.ok) {
          const data: AgentStatusResponse = await res.json();
          setStatus({
            address: data.wallet.address,
            chain: data.wallet.chain,
            balanceUSDC: data.wallet.balanceUSDC,
            attested: data.identity.attested,
            agentId: data.identity.agentId,
            creatorAddress: data.identity.creatorAddress,
            attestationUid: data.identity.attestationUid,
            registeredAt: data.identity.registeredAt,
            x402Listed: data.x402.listed,
            serviceId: data.x402.serviceId,
            pricing: data.x402.pricing,
            uptime: data.uptime,
            version: data.version,
          });
        }
      } catch {
        // Use defaults
      } finally {
        setStatusLoading(false);
      }
    }
    fetchStatus();
    // Refresh every 60s
    const interval = setInterval(fetchStatus, 60_000);
    return () => clearInterval(interval);
  }, []);

  const isLive = status.address !== '0x...' && status.attested;

  return (
    <main className="min-h-screen bg-black text-white">
      {/* Hero Strip */}
      <section className="border-b border-white/10 bg-gradient-to-b from-amber-900/20 to-black px-4 py-16">
        <div className="mx-auto max-w-3xl text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-4 py-1.5 text-sm text-amber-400">
            <span className="relative flex h-2 w-2">
              <span
                className={`absolute inline-flex h-full w-full rounded-full opacity-75 ${isLive ? 'animate-ping bg-green-400' : 'animate-ping bg-amber-400'}`}
              />
              <span
                className={`relative inline-flex h-2 w-2 rounded-full ${isLive ? 'bg-green-500' : 'bg-amber-500'}`}
              />
            </span>
            {isLive ? 'Agency Live' : 'Agency Standby'}
          </div>
          <h1 className="mb-4 font-serif text-5xl font-bold tracking-tight">Meet Sigil</h1>
          <p className="mx-auto max-w-xl text-lg text-white/60">
            Signet's autonomous document analysis agent. Attested onchain, powered by AI, available
            24/7.
          </p>
        </div>
      </section>

      {/* Dashboard Grid */}
      <section className="border-b border-white/10 px-4 py-8">
        <div className="mx-auto max-w-3xl">
          <h2 className="mb-6 text-center font-serif text-2xl font-bold text-white/80">
            Agent Dashboard
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {/* Wallet Card */}
            <DashboardCard title="Wallet" icon="💳">
              <DashboardRow
                label="Address"
                value={
                  status.address === '0x0000000000000000000000000000000000000000'
                    ? 'Not configured'
                    : `${status.address.slice(0, 6)}...${status.address.slice(-4)}`
                }
                loading={statusLoading}
              />
              <DashboardRow
                label="Chain"
                value={status.chain.toUpperCase()}
                loading={statusLoading}
              />
              <DashboardRow
                label="Balance"
                value={`${status.balanceUSDC} USDC`}
                loading={statusLoading}
              />
            </DashboardCard>

            {/* Identity Card */}
            <DashboardCard title="Identity" icon="🛡️">
              <DashboardRow
                label="Status"
                value={status.attested ? 'Attested onchain' : 'Not attested'}
                highlight={status.attested}
                loading={statusLoading}
              />
              {status.agentId && status.agentId !== '0x...' && (
                <DashboardRow
                  label="Agent ID"
                  value={`${status.agentId.slice(0, 8)}...`}
                  loading={statusLoading}
                />
              )}
              {status.creatorAddress && (
                <DashboardRow
                  label="Creator"
                  value={`${status.creatorAddress.slice(0, 6)}...${status.creatorAddress.slice(-4)}`}
                  loading={statusLoading}
                />
              )}
              {status.registeredAt && (
                <DashboardRow
                  label="Registered"
                  value={status.registeredAt}
                  loading={statusLoading}
                />
              )}
            </DashboardCard>

            {/* Marketplace Card */}
            <DashboardCard title="Marketplace" icon="🏪">
              <DashboardRow
                label="Listing"
                value={status.x402Listed ? 'Listed ✓' : 'Unlisted'}
                highlight={status.x402Listed}
                loading={statusLoading}
              />
              <DashboardRow label="Service ID" value={status.serviceId} loading={statusLoading} />
              <div className="mt-2 space-y-1">
                {Object.entries(status.pricing).map(([op, price]) => (
                  <div key={op} className="flex items-center justify-between text-xs">
                    <span className="text-white/40 capitalize">{op}</span>
                    <span className="font-mono text-amber-400">${price} USDC</span>
                  </div>
                ))}
              </div>
            </DashboardCard>

            {/* Uptime Card */}
            <DashboardCard title="Uptime" icon="⏱️">
              <DashboardRow label="Running" value={status.uptime} loading={statusLoading} />
              <DashboardRow label="Version" value={`v${status.version}`} loading={statusLoading} />
            </DashboardCard>
          </div>
        </div>
      </section>

      {/* Chat Interface */}
      <section className="px-4 py-8">
        <div className="mx-auto max-w-3xl">
          <AgentChat />
        </div>
      </section>

      {/* Capabilities */}
      <section className="border-t border-white/10 px-4 py-16">
        <div className="mx-auto max-w-3xl">
          <h2 className="mb-8 text-center font-serif text-3xl font-bold">Capabilities</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {capabilities.map((cap) => (
              <CapabilityCard key={cap.title} {...cap} />
            ))}
          </div>
        </div>
      </section>

      {/* CTA: Full document analysis */}
      <section className="border-t border-white/10 px-4 py-12">
        <div className="mx-auto max-w-3xl text-center">
          <p className="mb-4 text-sm text-white/30">
            Have a document to analyze? Get full risk scoring and on-chain attestation.
          </p>
          <Link
            href="/review"
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-5 py-2 text-xs text-white/50 transition-colors hover:border-amber-500/30 hover:text-white/80"
          >
            Go to Document Review
            <svg
              width="12"
              height="12"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M6 4l4 4-4 4" />
            </svg>
          </Link>
        </div>
      </section>

      {/* Marketplace CTA */}
      <section className="border-t border-white/10 px-4 py-16">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="mb-4 font-serif text-3xl font-bold">Find Sigil on Circle Marketplace</h2>
          <p className="mb-6 text-white/60">
            Sigil is a registered x402 service. Pay with USDC for deep document analysis and legal
            knowledge queries.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <a
              href="/api/x402/service-info"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full bg-amber-600 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-amber-500"
            >
              View Service Info
            </a>
            <a
              href="https://marketplace.circle.com"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full border border-white/20 px-6 py-3 text-sm font-semibold text-white/70 transition-colors hover:border-white/40 hover:text-white"
            >
              Open Marketplace ↗
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <div className="max-w-2xl mx-auto w-full pb-8 text-center">
        <p className="font-mono text-[10px] text-white/15">
          Sigil — Signet Legal Clarity Agent — Listed on Circle Agent Marketplace
        </p>
      </div>
    </main>
  );
}

function DashboardCard({
  title,
  icon,
  children,
}: {
  title: string;
  icon: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-5 transition-colors hover:border-white/20">
      <div className="mb-3 flex items-center gap-2">
        <span className="text-lg">{icon}</span>
        <h3 className="text-sm font-semibold uppercase tracking-wider text-white/50">{title}</h3>
      </div>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function DashboardRow({
  label,
  value,
  loading,
  highlight,
}: {
  label: string;
  value: string;
  loading: boolean;
  highlight?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-white/40">{label}</span>
      {loading ? (
        <div className="h-3 w-20 animate-pulse rounded bg-white/10" />
      ) : (
        <span className={`text-xs font-mono ${highlight ? 'text-green-400' : 'text-white/70'}`}>
          {value}
        </span>
      )}
    </div>
  );
}

function CapabilityCard({
  icon,
  title,
  description,
}: {
  icon: string;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-6 transition-colors hover:border-amber-500/30">
      <div className="mb-3 text-2xl">{icon}</div>
      <h3 className="mb-2 font-semibold text-white">{title}</h3>
      <p className="text-sm text-white/50">{description}</p>
    </div>
  );
}

const capabilities = [
  {
    icon: '📄',
    title: 'Document Analysis',
    description:
      'AI-powered legal document risk and completeness analysis. Identifies imbalanced clauses, missing provisions, and compliance issues. $0.01 USDC.',
  },
  {
    icon: '⚖️',
    title: 'Legal Knowledge',
    description:
      'Web-researched legal guidance with mandatory disclaimers. Not legal advice — informational only. $0.005 USDC.',
  },
  {
    icon: '🛡️',
    title: 'Notary Attestation',
    description:
      'Passkey-signed document attestation on Base EAS with Arc transaction memo journal entries.',
  },
  {
    icon: '👁️',
    title: 'Neutral Witness',
    description:
      'Third-party witness for agent-to-agent agreements. Attests escrow deposits, deliverable verification, and dispute resolution. $0.02 USDC.',
  },
  {
    icon: '⏱️',
    title: 'Proof of Existence',
    description:
      'Immutable proof a document existed at a specific time. EAS attestation + Arc memo. $0.005 USDC.',
  },
  {
    icon: '✅',
    title: 'Compliance Audit',
    description:
      'Regulatory compliance verification against GDPR, ABA, and other standards. Attested findings. $0.05 USDC.',
  },
  {
    icon: '⭐',
    title: 'Agent Reputation',
    description:
      'On-chain agent reputation score: completed agreements, dispute rate, resolution time. EAS-attested. $0.03 USDC.',
  },
  {
    icon: '🔮',
    title: 'Legal Oracle',
    description:
      'Legal event oracle: research questions via web + sources, attest answers on-chain for smart contracts. $0.05 USDC.',
  },
  {
    icon: '🏁',
    title: 'Milestone Verification',
    description:
      'Verify deliverables against acceptance criteria. Lighter than full escrow. $0.01 USDC.',
  },
  {
    icon: '🌐',
    title: 'Translation Fidelity',
    description:
      'Verify translation accuracy against source document. Attest fidelity or specific discrepancies. $0.03 USDC.',
  },
];
