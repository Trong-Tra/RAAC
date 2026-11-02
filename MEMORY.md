# MEMORY.md

## Purpose

Hot working memory: implementation state, decisions, tasks, constraints, discoveries, unresolved questions. Read at the start of every substantive task; update when state changes. Concise facts over prose. Mark stale facts rather than silently deleting history.

## Current State (2026-11-02, post-purge)

### Project Identity

- **RAAC — Routing, Accountability, and Auditable Councils.** ERC-8004 trustless agent network for research paper peer review on **Base Sepolia only (84532)**.
- **Flow:** submit paper + fee → rank agents via ERC-8004 + The Graph → top 5 → author signs EIP-712 → council discusses → 5 independent reviews → hashes anchored on 84532.
- **Positioning:** broker/recruiter + orchestrator. The Graph = trust/data layer; Base Sepolia = settlement/anchor layer.
- Repo root dir is `RAAC` (the old `cubic` dir name is gone). Packages: root `raac-network`, app `@raac/app`.

### 2026-11-02 Cubic Purge (commit after `8af2d8b`)

Everything Cubic-flavored was deleted, not deprecated:

- **Server modules gone:** `gateway/`, `capability/`, `ledger/`, `payments/` (x402), `executors/`, `mcp/`, `reasoning/` (LangSmith), `anchors/hcs.ts`, `anchors/init-topic.ts`, `domain.ts`, `demo/parse.ts`, `demo/identity.ts`, `instrumentation.ts`.
- **API routes gone:** `/api/approvals`, `/api/gateway/*`, `/api/console/{agents,councils,policies}`, `/api/mcp`, `/api/services/scanner`, `/api/anchors/verify`, `/api/audit/trace`, `/api/demo/seed`.
- **UI gone:** `DecisionFeed` (landing), console `AgentDetail`/`DecisionDetail`/`TraceView`, `NetworkGraph`/`topology.ts`, console audit Cubic event filters.
- **DB:** migration `0003_purge_cubic.sql` **applied to shared Neon** (user-approved 2026-11-02) — dropped `approvals, capabilities, councils, decisions, executions, intents, payments, policies, tasks, tools` + `audit_events.task_id` (now indexed `tenant_id, created_at`). Remaining tables: `tenants, agents, audit_events, network_events, papers, paper_councils, council_messages, reviews, paper_fees`.
- **Schema note:** `audit_events` has no `task_id`; `emit()` input no longer takes `task_id`. Event bus is 9 RAAC types only (`paper.*`, `agents.ranked`, `council.*`, `signature.verified`, `discussion.message`, `review.submitted`). Pseudonym salt now `raac-network-v1` (was `cubic-network-v1` — old network_events rows keep old pseudonyms).
- **Deps removed:** `@x402/hedera`, `@hiero-ledger/sdk`, `@modelcontextprotocol/sdk`. `app/package.json` renamed `@raac/app` — run filters as `pnpm --filter @raac/app …`.
- **Tests:** 21 Cubic suites deleted. Remaining: `seed.test` (6 agents, 0 papers), `config.test`, `raac-adversarial.test` (low-rep exclusion via live reputation < 0.3, unsigned-council block, tampered EIP-712), `src/server/logging.test`. **9/9 green.** Adversarial test inserts its own paper fixture (`makePaper`) because seed no longer seeds papers.
- **Landing `MarketSection`** rewired from Cubic agent-security narrative to RAAC peer-review thesis (TAM 5M papers/yr STM, SAM 120k ICLR/Decoder, SOM 55k RAAC estimate + 5 sourced overload signals).
- **Docs purged:** `docs/ledger.md`, `docs/demo-script/`. GitNexus block removed from AGENTS.md (index dir no longer exists). CLAUDE.md/GEMINI.md are copies of AGENTS.md.
- **Agent dirs consolidated (2026-11-02):** `.claude/`, `.openchamber/`, `.opencode/` deleted (dead tooling + old screenshots). `.agents/` now holds **only `skills/`** (ponytail suite + caveman, locked in `skills-lock.json`); old `plans/`, `dispatch/`, `guides/` (pre-RAAC build plans) deleted — history lives in git.
- Build green: **24 routes**, all RAAC.

### Working Pipeline (all live-verified historically)

1. **Intake** — `POST /api/papers`: arXiv URL/ID (fetches title/abstract, category→domain, `paperHash=sha256(arxiv:id|title)`) or manual title+abstract+domain.
2. **Selector** — `app/src/server/selector/index.ts`: `0.5·overall + 0.4·domain + 0.1·recency`, validation-fail ×0.2, deterministic tie-break. Trust from `app/src/server/graph/agent0.ts` (Agent0/ERC-8004 subgraph, zod-validated, 60s cache, endpoint fallback). Static `FALLBACK_SCORES` when no Graph key.
3. **Signature gate** — `app/src/server/council/signature.ts`: EIP-712 `CouncilFormation(paperId, paperHash, selectionHash, author)` chainId 84532, `viem verifyTypedData`; UI signs via `eth_signTypedData_v4`.
4. **Council** — `app/src/server/council/orchestrator.ts` `runCouncil()`: resumable; discussion messages are deterministic templates; reviews are live OpenRouter `:free` calls with per-agent personas, 7-section academic JSON, ar5iv full-text fetch, multi-key 429 fallback, `academicMockFor` when rate-limited. Full JSON rides in `reviews.summary` after `FULL_JSON:`.
5. **Anchoring** — `app/src/server/anchors/base.ts`: per-review 0-value self-tx `data=0x<reviewHash>` on 84532, `anchorTxHash` + Basescan links. Deployer wallet `0x7EA6…F1F2` (key in `.env.local`).

### Surfaces

- `/` landing (HeroCopy live stats, Manifesto, Team, Marquee, Details, MarketSection, Closer — NetworkCanvas/CloserCanvas are abstract visuals, kept).
- `/papers` + `/papers/[id]` — global list → detail: routing scores, SIGN, RUN, transcript, 7-section reviews, ANCHOR + Basescan.
- `/network` — stats, AgentWorldMap (react-simple-maps, node size ∝ `agents_registered`, local `public/geography/countries-110m.json`), COUNCIL FABRIC, PIPELINE, SSE event stream.
- `/console` — 5-step stepper (submit→council→sign→run→anchor), MY PAPERS / ALL PAPERS, `/console/papers`, `/console/audit` (paginated RAAC events), `/console/settings` (read-only).
- `/api/graph/verify` kept — live ERC-8004 subgraph verification endpoint.

### Decisions

- Storage: Postgres via `DATABASE_URL` in `app/.env.local` — **currently the shared partner Neon** (`ep-soft-sea-…neon.tech/neondb`). drizzle + postgres.js + drizzle-kit. Local fallback: `compose.yaml` `raac-pg` on 5433.
- Seed (`app/src/server/demo/seed.ts`) = demo tenant + **6 agents only, 0 papers** (slate clean; papers come from live submits). Agents: `84532:9223–9227` owned + `8453:74108` (lab-1, real negative feedback adversarial fixture). `app/scripts/wipe-seed.ts` wipes demo papers; `list-papers.ts`/`check-paper.ts` inspect; `register-agent-8004.ts` registers identities (descriptions now RAAC reviewer personas).
- Contracts: `contracts/` still Foundry boilerplate (Counter). Fee escrow contract NOT built — `paper_fees` table is a row + tx ref; no release tx. Anchoring uses raw self-txs, no contract.
- Free-tier guard: `chatModel()` forces `openrouter/free`/`:free` — never bills. Multi-key via `OPENROUTER_API_KEY`, `_2`, `_KEYS` (comma-separated), rotates on 429.
- MVP honesty: council discussion is templated and reviews are server-side OpenRouter calls keyed to agent personas — UI presents them as ERC-8004 agent output. Deliberate per user (2026-11-02): fine for MVP, addressed verbally in pitches, **never flagged on the site**.

### Important Constraints

- The Graph via Agent0/ERC-8004 is mandatory for selection — not mockable if the trustless claim is to hold.
- Selection deterministic + explainable; LLM never the final ranker.
- Paper content off-chain; only hashes/attestations on-chain.
- Never reintroduce Hedera/x402/Blocky402 or the deleted Cubic modules.

### Known Issues / Open Questions

- Fee escrow contract + reviewer payout split: not specced. `contracts/` untouched.
- Real A2A/MCP agent execution (agents reasoning on their own infra) is post-MVP.
- `paper_fees.releaseTxHash` unused until escrow exists.
- Old `network_events` rows (pre-purge) carry `cubic-network-v1` pseudonyms — cosmetic only.

### RAAC Market Thesis (TAM-SAM-SOM)

- **Signal:** ICLR 2027 ~50–60k abstracts vs 19,525 valid submissions ICLR 2026 (ICLR blog 2026-03-31: 76,139 reviews from 18,054 reviewers, 5,355 accepted). 21% of ICLR 2026 reviews fully AI-generated (Pangram, arXiv 2607.27183). Nov 2025 OpenReview breach exposed ~45% of submissions. ICLR caps new authors at 1 paper.
- **TAM:** ~3–5M peer-reviewed papers/yr (STM). Every submission needs 2–3 unpaid reviews.
- **SAM:** ~80–120k AI/ML conference + arXiv cs.* submissions/yr, 60–70% YoY growth.
- **SOM:** ~50–60k papers/yr at ICLR/NeurIPS/ICML — first wedge: pre-screen + triage councils. Value = time saved + trust score.
- **Pitch:** Routing (which 5 reviewers), Accountability (on-chain reputation), Auditable Councils (transcript + independent scores + anchored hashes).

### Demo Runbook (short)

1. `pnpm --filter @raac/app dev` (needs `.env.local`: DATABASE_URL, THEGRAPH_API_KEY or AGENT0_SUBGRAPH_URL, OPENROUTER_API_KEY(+fallbacks), BASE_SEPOLIA_PRIVATE_KEY for anchoring).
2. `/console` → submit arXiv URL → auto-propose → SIGN (wallet, 84532) → RUN (5 live reviews, ~1–2 min on free tier) → ANCHOR (5 txs).
3. `/papers/[id]` shows selection math, transcript, full 7-section reviews, Basescan links. `/network` shows counters + fabric + world map.
4. Full detail: `docs/demo.md`. Verify: `pnpm --filter @raac/app build && pnpm --filter @raac/app test` (9/9).
