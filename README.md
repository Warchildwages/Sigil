# Sigil 🦅 — Legal Agent

**Casper Agentic Buildathon 2026 — Guest Agent**

Your legal agent for the autonomous economy. Witness agreements, run compliance checks, timestamp documents, resolve disputes — all via x402 micropayments on Casper, attested on-chain via EAS.

---

## Architecture

Sigil is a **monorepo** with a swarm of micro-agents:

```
apps/
├── agent/          # Main Sigil agent (Next.js, 11 operations)
├── compliance/     # Compliance micro-agent (separately deployable)
├── regulatory/     # Regulatory micro-agent
├── validator/      # Validation micro-agent
└── vera/           # Companion trust agent
packages/
├── shared/         # Types, schemas, errors, templates, pricing
├── blockchain/     # Chain utilities, identity, EAS, x402
├── db/             # Prisma schema + migrations
└── sdk/            # Client SDK for Sigil API
```

---

## Operations (11)

| Operation | Endpoint | Price | Description |
|-----------|----------|:-----:|-------------|
| Analyze | `/api/x402/analyze` | $0.01 | Document analysis and risk assessment |
| Knowledge | `/api/x402/knowledge` | $0.005 | Legal knowledge base queries |
| Witness | `/api/x402/witness` | $0.02 | Notarize/certify an event or document |
| Timestamp | `/api/x402/timestamp` | $0.005 | Proof of existence via on-chain timestamp |
| Compliance | `/api/x402/compliance` | $0.05 | Regulatory compliance checks |
| Reputation | `/api/x402/reputation` | $0.03 | Reputation scoring for legal actors |
| Oracle | `/api/x402/oracle` | $0.05 | Provide verified data for contracts |
| Milestone | `/api/x402/milestone` | $0.01 | Track and verify milestones |
| Translate | `/api/x402/translate` | $0.03 | Legal document translation |
| Escrow | `/api/x402/escrow` | $0.05 | Create/release escrow for legal agreements |
| Dispute | `/api/x402/dispute` | $0.04 | File and manage dispute resolution |

---

## Ecosystem Integration

Sigil integrates with the other agents in the Axium ecosystem:

- **Vera 🛡️** — Trust authority. Vera verifies Sigil's identity and attests its reputation on-chain.
- **Luna 🌙** — Event agent. Sigil witnesses Luna's event contracts and attests them on-chain.

Together, they form a complete agent economy: events + legal + trust.

---

## Quick Start

```bash
pnpm install
cp .env.example .env
pnpm dev
```

## Identity Stack

Sigil uses Ed25519 (Casper), EAS attestations (EVM), and did:nostr for cross-chain identity — the same three-layer stack as Luna.

## Links

- GitHub: https://github.com/Warchildwages/Sigil
- Vera (trust authority): https://github.com/Warchildwages/Vera
- Luna (event agent): https://github.com/Warchildwages/Luna
