# RAAC — Production Deployment Runbook

Everything you do, in order: accounts, database, secrets, Vercel, verification, third parties.
Assumed starting point: clean `main`, `typecheck` / `lint` / `build` green.

---

## 1. What ships where

| Concern | Service | Note |
|---|---|---|
| UI **and** API (one Next.js app) | **Vercel** | API routes ship inside the same app — there is no separate backend to deploy |
| Postgres | **Neon** | pooled URL in Vercel, direct URL for migrations |
| LLM review generation | **OpenRouter** | default model `openrouter/free`; without it, reviews cannot run |
| Reputation / ranking | **The Graph** gateway | Agent0 ERC-8004 subgraph; unset → static fallback (works, but not live-trustless) |
| Chain: fee rows + review-hash anchoring txs | **Base Sepolia (84532)** | public RPC by default; a relayer wallet signs anchor txs |
| DNS / domain | your registrar → Vercel | optional |
| Smart contracts | **none** | `contracts/` is unused Foundry scaffold — nothing to deploy |
| File storage | **none** | papers are arXiv links + abstracts in Postgres |

## 2. Accounts — status check

| Account | Status |
|---|---|
| **vercel.com** | **the only new signup** (Hobby is enough — fluid functions default & max at 300 s, which covers a council sitting) |
| **neon.tech** | already yours — the app has been running on the shared demo DB all along |
| **openrouter.ai** | already yours — reuse the key from `app/.env.local` |
| **thegraph.com/studio** | already yours — reuse `THEGRAPH_API_KEY` / `AGENT0_SUBGRAPH_URL` from `app/.env.local`; The Graph is called at runtime, nothing to deploy or provision there |
| **Base Sepolia relayer** | already yours — the funded demo wallet key in `.env.local`; optional: make a dedicated wallet later |
| Alchemy/QuickNode RPC | optional — the public `https://sepolia.base.org` default works |
| Domain registrar | optional |

## 3. Pick the database (two paths)

**Path A — reuse the shared Neon you've been running on.** Paste that same `DATABASE_URL` into Vercel and **skip the rest of this section** — tenant, 6-agent roster, and the five demo papers already exist.
> Caveat: your local `pnpm test` wipes this database by design. While production points at it, keep local testing off it (or switch to Path B).

**Path B — fresh production database (recommended for anything public).** Same Neon account, new database (no new service):

```bash
pnpm i                                                     # repo root

# migrations — use the DIRECT connection string:
DATABASE_URL='<neon-direct-url>' pnpm --filter @raac/app db:migrate

# tenant + 6-agent roster — idempotent, safe to re-run, touches nothing else:
DATABASE_URL='<neon-direct-url>' pnpm --filter @raac/app exec tsx scripts/provision.ts
```

A fresh DB without this returns `500 demo tenant missing` on paper intake (the app does not auto-create the tenant).

## 4. Relayer wallet (on-chain anchoring)

1. You already have one: the funded demo relayer key in `app/.env.local` (`BASE_SEPOLIA_PRIVATE_KEY`) — paste it into Vercel as-is.
2. Optional hardening for a long-lived production: a dedicated fresh wallet, funded from the Base Sepolia faucet.

Unset → app runs normally, but the anchoring step logs a warning and reports stay unanchored.

## 5. Deploy on Vercel

1. **Add Git repo → New Project.** Set **Root Directory: `app`** (monorepo; Next.js preset is auto-detected, `pnpm-lock.yaml` lives at the repo root).
   - If install cannot find the workspace lockfile: Settings → Git → enable *Include files outside of the Root Directory*.
2. Add **all environment variables** (table below) *before* the first deploy — quickest is a one-for-one mirror of `app/.env.local` (every key except `DATABASE_URL` stays identical either way).
3. **Deploy.** Build command stays `next build` (default). Do not wire `pnpm test` into build/CI — destructive by design.
4. Optional: Domains tab → add your domain → create the DNS records at your registrar.

### Environment variables

| Variable | Needed | Value |
|---|---|---|
| `DATABASE_URL` | ✅ | Neon **pooled** connection string (`sslmode=require`) |
| `OPENROUTER_API_KEY` | ✅ | review generation — product core |
| `OPENROUTER_API_KEY_2` / `OPENROUTER_API_KEYS` | optional | rotation on free-tier 429s |
| `THEGRAPH_API_KEY` | ✅ recommended | gateway key; builds `gateway.thegraph.com/api/<key>/subgraphs/id/<id>` |
| `AGENT0_SUBGRAPH_URL` | alternative | full subgraph URL override (instead of the key) |
| `BASE_SEPOLIA_PRIVATE_KEY` | ✅ recommended | relayer signing anchor txs; skipped with a warning if unset |
| `BASE_SEPOLIA_RPC_URL` | optional | default `https://sepolia.base.org` |
| `CHAT_MODEL` | optional | default `openrouter/free` |
| `DEMO_TENANT_SLUG` | leave default | `demo` — must match what `provision.ts` created |
| `RAAC_NETWORK` / `RAAC_CHAIN_ID` | leave default | `base-sepolia` / `84532` |
| `LOG_FORMAT` | recommended | `json` (structured Vercel log queries); default `text` |

## 6. Smoke checklist (after first deploy)

- [ ] `/` loads — plates, hero, foundation citation; no console errors at 1440 px and 390 px.
- [ ] `/console` disconnected → “Connect a wallet to access your console.” gate.
- [ ] Connect wallet → submit an arXiv URL → paper appears with domain tag + top-5 ranking.
- [ ] Sign council formation → run starts → **5 reports** land (single sitting, usually ≤ ~1–3 min).
- [ ] Click **Anchor** in the console → journey reaches step 4; paper page verify panel goes green (needs relayer key + gas).
- [ ] `/papers/[id]` — five roman tabs, one report per tab.
- [ ] `/network` and `/catalogue` render live aggregates; feed keeps polling.
- [ ] Vercel → Functions logs show `effective config` line with the expected “set” entries.

## 7. How it behaves on Vercel (know this)

- **Council runs** are single-flight (in-process lock) **and** race-safe (unique `council+agent` rows). If a run is cut off mid-sitting, reopen the console on that paper — it resumes and only generates missing reviews; nothing double-bills.
- **300 s cap** (Hobby max = Pro default): a full 5-agent sitting fits comfortably; worst case, the resume path above covers it.
- **`/api/network/stream`** (SSE): the browser's `EventSource` auto-reconnects if the cap closes the connection.
- **Endpoints are unauthenticated** (demo-grade surface: anyone can trigger `run`/`anchor` for an existing paper). Acceptable for the demo; add a shared-secret header before exposing real user data.
- **Logs / rollback:** Vercel → Functions (set `LOG_FORMAT=json`); instant rollback to any previous deployment.
- **Database:** enable Neon restore point / branch for backups. Rollback of schema is manual — migrate forward only.

## 8. Third parties to disclose

| Party | Purpose |
|---|---|
| Vercel | hosting — UI + API |
| Neon | Postgres database |
| OpenRouter | LLM API for review generation |
| The Graph | subgraph gateway (ERC-8004 reputation queries) |
| Base Sepolia (Coinbase) | chain: fee rows, EIP-712 flows, anchor txs — public RPC or Alchemy/QuickNode |
| Google Fonts | Source Serif 4 + Courier Prime — fetched at build, self-hosted afterwards (no runtime calls) |
| Domain registrar | only if you attach a custom domain |

Nothing else is called at runtime. Local-only studies stay git-ignored and never ship.
