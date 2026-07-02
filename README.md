# Sigil 🦅

Your legal agent. Witness, escrow, dispute, compliance.

Powered by **Signet** — the universal platform for official acts.

## Architecture

Sigil is a **monorepo** with workspaces:

```
sigil/
├── apps/
│   └── agent/          # Next.js + Sigil Agent
├── packages/
│   ├── shared/         # Types, schemas, errors, templates
│   ├── blockchain/     # Chain utilities, identity, EAS, x402
│   ├── db/             # Prisma schema + migrations
│   └── sdk/            # Client SDK for Sigil API
├── turbo.json          # Turborepo config
└── package.json        # Root workspace config
```

## Operations

| Operation | Endpoint | Description |
|-----------|----------|-------------|
| Witness | `/api/x402/witness` | Notarize/certify an event or document |
| Escrow | `/api/x402/escrow` | Create/release escrow for legal agreements |
| Dispute | `/api/x402/dispute` | File and manage dispute resolution |
| Compliance | `/api/x402/compliance` | Regulatory compliance checks |
| Milestone | `/api/x402/milestone` | Track and verify milestones |
| Oracle | `/api/x402/oracle` | Provide verified data for contracts |
| Reputation | `/api/x402/reputation` | Reputation scoring for legal actors |
| Timestamp | `/api/x402/timestamp` | Proof of existence via on-chain timestamp |
| Analyze | `/api/x402/analyze` | Document analysis and risk assessment |
| Knowledge | `/api/x402/knowledge` | Legal knowledge base queries |
| Translate | `/api/x402/translate` | Legal document translation |

## Quick Start

```bash
pnpm install
cp .env.example .env
# fill in .env
pnpm dev
```

## Identity Stack

Sigil uses the same three-layer identity as Luna:
- **Ed25519 (Casper)** — agent keypair
- **EAS (EVM)** — on-chain attestations
- **did:nostr** — cross-chain HTTP-based DID

## License

MIT
