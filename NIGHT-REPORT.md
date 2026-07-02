# Sigil Monorepo — Created ✅

**Location:** `WarchildDev/Sigil/`
**Remote:** `https://github.com/Warchildwages/Sigil`
**Deps:** Installed (1032 packages)

### Structure
```
Sigil/
├── apps/agent/           # Next.js app (from Signet demo)
│   ├── app/api/          # 18+ x402 endpoints + business routes
│   ├── lib/              # sigil-nlu, llm, x402, EAS, DID, identity
│   ├── components/       # UI components
│   └── __tests__/        # smoke + api tests
├── packages/
│   ├── shared/           # Types, schemas, errors
│   ├── blockchain/       # EAS, Circle, chains, signing
│   ├── db/               # Prisma schema + migrations
│   └── sdk/              # React widget SDK
├── tsconfig.base.json
├── turbo.json
├── vitest.config.ts
├── biome.json
├── .env.example
└── README.md
```

### Package names updated: @signet/* → @sigil/*

---

## Structural Audit — Luna vs Sigil

| Dimension | Luna | Sigil | Gap |
|-----------|------|-------|-----|
| README | ✅ | ✅ (basic) | Need ops table like Luna |
| .env.example | ✅ | ✅ | Trimmed for Sigil |
| lefthook.yml | ✅ apps/agent/ | ❌ MISSING | Needs copy from Luna |
| middleware.ts | ✅ | ✅ (from Signet) | Has rate-limit + sentry |
| .gitleaks.toml | ❌ | ❌ | Both missing |
| Health endpoint | ✅ /api/health | ✅ /api/health | Both OK |
| Smoke tests | ✅ 2 files | ✅ | Both OK |
| Multi-provider LLM | ✅ venice+llm | ✅ venice+llm+openrouter | Sigil has more providers |
| DID:nostr | ✅ did-nostr.ts | ✅ sigil-did-nostr.ts | Both OK |
| x402 ops | 11 endpoints | 18+ endpoints | Sigil has more legal ops |
| Scripts complete | ✅ all 8 | ❌ missing dev,build,start | Need to add |
| Package scripts | ✅ turbo | ✅ turbo | OK |
| tsconfig strict | ✅ | ✅ | Both OK |

**Mirror items to backport from Luna → Sigil:**
- lefthook.yml for pre-commit (biome format + typecheck)
- Scripts: add typecheck/test:coverage/test:watch to root + app package.json
- .gitleaks.toml for secret scanning

---

## Tomorrow's List — What Needs You

### 1. 👤 Name Service Selections
- **CSPR.name:** Register `luna.cspr`, `sigil.cspr` → Go to [cspr.name](https://cspr.name)
- **ENS:** Register `luna-agent.eth`, `sigil-agent.eth` → Use ENS app
- **DNS-AID records:** Decide which domain to publish agent discovery under (signet.ventures? allfans.com?)

### 2. 🔑 API Keys Needed (for .env)
| Service | Purpose | Luna | Sigil |
|---------|---------|------|-------|
| VENICE_API_KEY | Primary LLM | ✅ | ❌ needs copy |
| GEMINI_API_KEY | Fallback LLM | ✅ | ❌ |
| OPENROUTER_API_KEY | Fallback LLM | ✅ | ❌ |
| GROQ_API_KEY | Fallback LLM | ✅ | ❌ |
| OPENAI_API_KEY | Fallback LLM | ✅ | ❌ |
| SENTRY_DSN | Error monitoring | ❌ | from Signet |
| DATABASE_URL | Prisma DB | ✅ | from Signet |

### 3. 🧩 Swarm Architecture (Compliance + Regulatory)
The swarm needs 3+ specialist agents to follow Sigil:
- **Compliance Agent** — jurisdiction checking, AML/KYC verification
- **Regulatory Agent** — cross-border regulatory mapping, reporting
- **Validator Agent** — independent verification of attestations

Each deploys as an ERC-8122 Minimal Agent Registry entry with:
- MCP discovery endpoint
- DNS-AID record
- x402 payment acceptance
- EAS attestation support

### 4. 🏗️ Init Repo + First Commit
```bash
cd WarchildDev/Sigil
git add .
git commit -m "feat: initial Sigil monorepo — agent, packages, config"
git push -u origin main
```

### 5. 📋 Codebase Indexing
codebase-memory-mcp CLI invocation needs the MCP stdio protocol (not CLI mode). To complete indexing:
- Add MCP server config to Hermes
- Or run `codebase-memory-mcp` as stdio server and send `index_repository` tool calls

Projects to index: Sigil, Luna (both prepped, both 1032+ deps installed)

### 6. 🏆 Buildathon Status
| Buildathon | Status | Action |
|------------|--------|--------|
| **Casper Agentic** | Extended to Jul 7 ⏰ | Submit Luna + Sigil |
| **Avalanche Build Games** | Concluded Feb-Mar ✅ | Not active |
| **Avalanche Team1 Hackathon** | 6-city event | Check if still open |

---

## What the Night Loop Will Do

The Arcana Pipeline #2 fires at **02:45 PT**. It can:
1. Add lefthook.yml to Sigil (mirrored from Luna)
2. Sync package scripts (typecheck, coverage)
3. Audit the Signet repo for leftover Sigil code to clean up
4. Verify the indexing once MCP is configured

The Social & Brand Monitor fires at **04:00 PT** — will sweep Casper/X for latest agent economy posts.

---

## Quick Summary for Morning Brief

**Night of Jul 1→2 accomplishments:**
- ✅ Sigil extracted to standalone monorepo at `WarchildDev/Sigil/`
- ✅ 18 x402 legal ops, legal NLU, EAS attestations, cross-chain identity
- ✅ Package namespacing (@sigil/*), deps installed
- ✅ Git initialized with remote origin
- ✅ Research on: ENS/CSPR.name/ANS/DNS-AID/ERC-8004/ERC-8122
- ✅ Casper socials sweep (buildathon extended, Manifest timeline, v2.2.2)
- ✅ Structural audit identifying mirror gaps
- ⏳ Indexing (needs MCP config hookup)
