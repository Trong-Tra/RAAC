# MEMORY.md

## Purpose

This is the project's hot-memory layer: the actively maintained working fact store for agents. It records implementation state, decisions, current tasks, constraints, discoveries, unresolved questions, and project nuances that should survive across agent sessions.

## Agent Instructions

- **MUST read MEMORY.md at the start of every substantive task.**
- **MUST update MEMORY.md when implementation state, architecture, decisions, tasks, constraints, or important technical facts change.**
- Prefer concise, factual entries over prose.
- Record decisions with enough context to prevent later agents from accidentally reversing them.
- Mark stale or superseded facts clearly rather than silently deleting useful history.
- Do not use MEMORY.md as a dump for transient chatter. Keep it useful as working memory.
- When uncertain whether a fact is current, verify it before treating it as authoritative.

## Current State

### Project Identity

- **Name: RAAC — Routing, Accountability, and Auditable Councils** (was Cubic — ripped 2026-09-21, fresh git `main`, no upstream, dir still `cubic` by request).
- **Scope: ERC-8004 trustless agent network for research paper peer review** on **Base Sepolia only** (84532). No Hedera, no cross-chain.
- **Flow:** `user submits paper + fee → system ranks network agents by knowledge/history/reputation/domain fit via ERC-8004+The Graph → picks top 5 → user signs → council of 5 opens (agents discuss) → each writes a review → output 5 reviews (all post-discussion)`.
- **Positioning:** RAAC is the broker/recruiter + orchestrator. Agents are registered on ERC-8004; The Graph is the trust/data layer; Base Sepolia is the settlement/anchor layer.

### What Was Ripped (Cubic Base)

- Monorepo `pnpm workspaces` with `app/` (Next.js 15, React 19, TS 5, drizzle-orm+postgres.js, viem, zod) + `contracts/` (Foundry 1.5.1, solc 0.8.24) — kept as-is.
- 13-table schema, 17-type event bus, capability model (5m TTL, nonce, policy_hash), ingest→normalize→policy→capability→execution→audit chain, MCP facade, Agent0/The Graph client, Ledger Key Ring abstraction, x402 Hedera payments, console + network viz, demo chat — all present but **Cubic-scoped** (tool-call allow/deny). Reused as infra, not product logic.
- Landing reassembled for RAAC: `Logo.tsx` RAAC wordmark, `layout.tsx` metadata RAAC, `SiteFooter.tsx` RAAC/TRUSTLESS RESEARCH, `HeroCopy.tsx` pipeline `paper → rank → council → 5 reviews`, `Manifesto.tsx` new thesis, `DetailsSection.tsx` card 3 → peer-review, `FaqList.tsx` RAAC Qs, `PartnerMarquee.tsx` `[THE GRAPH, BASE SEPOLIA, ERC-8004, AGENT0, RAAC]`, `DESIGN.md` wordmark RAAC, `compose.yaml` `raac-pg`/`raac-pgdata`, `package.json` `raac-network`, `app/.env.example` stripped Hedera → `BASE_SEPOLIA_RPC_URL`/`RAAC_NETWORK=base-sepolia`/`RAAC_CHAIN_ID=84532`.

### Active Work (2026-09-21)

- [x] Rebrand shell + single-network lock done (build green, `pnpm --filter app build` 14 routes).
- [x] The Graph retained — confirmed load-bearing for selector (Identity+Reputation+Validation on Base Sepolia). Not decoration.
- [x] Docs purge completed (2026-09-21): `PROJECT.md` rewritten to RAAC spec (paper→rank→council→5 reviews, §5 selector formula, Base Sepolia only), `AGENTS.md` product boundary + architectural rules flipped to recruiter/orchestrator, `DESIGN.md` wordmark RAAC, `docs/payment-flow.md` → Base Sepolia fee flow, `docs/acme-tenant.md` → Astra Lab research tenant, `docs/demo.md` → RAAC 6-beat runbook, `docs/ledger.md` → deprecated to EIP-712 note, `docs/submission-answers.md` → RAAC QAs, `docs/demo-script/README.md` → archived.
- [x] **Phase 1 — Domain schema (2026-09-21):** `papers`/`paper_councils`/`council_messages`/`reviews`/`paper_fees` in `schema.ts:190`, migration `0002_flaky_blizzard.sql` applied live, events `paper.submitted`…`paper.failed` in `types.ts:13`/`projection.ts:23`, seed now inserts Astra Lab paper `zl-421` (cryptography, hash `72bdf5…`, 0.001 ETH demo fee) — `seed()` returns `{papers:1}`, build 14 routes, 2 seed tests pass. Commit `080042b`.
- [x] **Phase 2 — UI shell (2026-09-21, UI-first per user):** `/papers` list + `/papers/[id]` detail shipped with mock Routing/Accountability/Auditable Councils (top-5 scores 0.94→0.85, transcript placeholder, 5 review cards), `/api/papers` + `/api/papers/[id]` (mock selection, reads demo tenant), `SiteHeader` adds `PAPERS`, build now 16 routes. Commit `080042b` (single RAAC genesis commit: schema + UI shell).
- [x] **Phase 3 — Selector (2026-09-21):** `app/src/server/selector/index.ts` live ranking `score=0.5*overall+0.4*domain+0.1*recency - penalty` via `HttpAgent0Client` (Base Sepolia Graph, fallback to `FALLBACK_SCORES` if unconfigured), `domainFit` proxy via capabilities, `agents.ranked → council.proposed` events + `paper_councils` row via `POST /api/papers/[id]/selection`, `/api/papers/[id]` now live (crypto-rev 0.855 > fairness 0.65 > 8472 0.555… lab-1 0.23 excluded), 2 new demo agents `crypto-rev:9226`/`fairness:9227` added (6 total, seed test updated). Commit `4d9bd4b`. Build 16 routes.
- [x] **Phase 4 — Signature gate on Base Sepolia 84532 (2026-09-21):** EIP-712 `RAAC CouncilFormation(paperId, paperHash, selectionHash, author)` via `viem verifyTypedData` in `app/src/server/council/signature.ts:1` + shared `app/src/lib/council-message.ts:1`, `RAAC_DOMAIN` chainId 84532 verifyingContract 0x0; `POST /api/papers/[id]/council/verify` verifies signature + optional feeTx on `BASE_SEPOLIA_RPC_URL` (`viem/baseSepolia` + `http(rpc)`) then flips `paper_councils` to `active` + `papers` to `reviewing`, emits `signature.verified → council.opened`; `/papers/[id]` Accountability now live SIGN via `window.ethereum eth_signTypedData_v4` using connected wallet (84532). Commit `3a8fc27`.
- [x] **Phase 5 — Council orchestration (2026-09-21):** `app/src/server/council/orchestrator.ts:1` deterministic `runCouncil(paperId)` — when council `active`, creates 5 `council_messages` + 5 `reviews` (hash `sha256(paperHash|agent|score|summary)`), emits `discussion.message`×5 + `review.submitted`×5 + `paper.completed`, flips to `completed`; `POST /api/papers/[id]/council/run` + `GET`, `/papers/[id]` Auditable Councils now live (RUN → 5 REVIEWS, live transcript + review cards). Verified on `zl-421`: 5 messages + 5 reviews (8,6,7,8,6). Commit `46d66ba`.
- [x] **Phase 5b — Console demo hub (2026-09-21):** `/console` OVERVIEW now RAAC demo hub (papers + PROPOSE/SIGN(84532)/RUN buttons + RESET), layout nav retitled to PAPERS/COUNCILS on 84532. Commit `e5873b6`.
- [x] **Phase 5c — Free tier guard (2026-09-21):** `parse.ts:40` `chatModel()` enforces `openrouter/free` / `:free` suffix — $50 OpenRouter credit never bills. Commit `7eb0fc6`.
- [x] **Phase 5d — Env simplification (2026-09-21):** `app/.env.example:1` 6 lines no values/comments, mirrors `app/.env.local` structure (now 6 keys: DATABASE_URL local raac-pg, Base Sepolia 84532, THEGRAPH e48b2ae…, openrouter/free). Commit `aa64962`.
- [x] **Phase 6 — Anchoring on Base Sepolia 84532 (2026-09-21, DEPLOYED):** `BASE_SEPOLIA_PRIVATE_KEY` in `config.ts:13`, `app/src/server/anchors/base.ts:1` `anchorReviewsForPaper` via `viem/baseSepolia` wallet (self-tx `data=0x<reviewHash>` on 84532, `waitForTransactionReceipt`, update `reviews.anchorTxHash` + `status=anchored`), `POST /api/papers/[id]/anchor` (+ `GET`), `/papers/[id]` Auditable Councils shows ANCHOR button + Basescan links. **Deployed 2026-09-21 on 84532 with 0.5 ETH wallet `0x7EA6…F1F2` (deployer):** paper `95a258ef…` (`zl-421` cryptography) → council `145d9993…` (5 selected crypto-rev 0.855…) → 5 msgs + 5 reviews (8,6,7,8,6) → 5 anchor txs on 84532: `0xa87338…`, `0x07eea5…`, `0x48c77b…`, `0x45d04e…`, `0x4d1435…` (sepolia.basescan.org/tx/0x…), spent 0.00000069 ETH (balance 0.596 → 0.596). Commit `204656d`, now verified via `council/run` + `anchor` GET.
- [x] **Phase 7 — Network + submit polish (2026-09-21):** `/network` re-pivoted from intents to `papers/councils/reviews` counters + domain clusters on 84532 (`app/src/app/network/page.tsx:1`), `/papers/new` submit flow with wallet prefill + hash derivation (`app/src/app/papers/new/page.tsx:1`), seed expanded to 4 papers (zl-421 + 3 arXiv: 1706.03762 Attention, 2407 VisionTrap, 2305 Positional Encoding) with `pdfUrl` field. Commits `1e03e1d`, `e84501f`, `fa84569`, `7706328`. Build 19 routes.
- [x] **Phase 8 — Live reviews + wallet + arXiv (2026-09-21):** `orchestrator.ts:69` `generateReviewViaOpenRouter()` live OpenRouter `:free` (never bills) with 7-section academic template + `fetchArxivFullText()` via `ar5iv.org/html/{id}` (DB only stores `pdfUrl` + 800-char abstract, council reads full paper on their own), `WalletProvider` real `window.ethereum` (no mock) in `app/src/components/WalletProvider.tsx:1`, EIP-712 now uses connected `address` not `DEAD`. Commits `0d76b2e`, `a9309c9`, `50cacd4`, `18314b0`. Review quality verified via `app/rerun-fixed.ts` (now removed — was breaking build). Current uncommitted: stagger 1.2s + retry×3 + 45s timeout + 2500 max_tokens + academic template normalization to DB columns.
- [ ] **Phase 9 — NEXT:** commit orchestrator polish (stagger/retry/template) + verify `OPENROUTER_API_KEY` live run on 4-paper cohort + anchor re-verify + adversarial fixtures (low-rep excluded, unsigned blocked) + final demo runbook.

### Decisions

- Monorepo stays `pnpm workspaces` (`app/` Next.js, `contracts/` Foundry). `app/src/server/` is gateway/orchestrator runtime (route handlers thin). `pnpm dev/build/typecheck` from root filter app; forge from root.
- Storage: Postgres via `DATABASE_URL` in `app/.env.local` (gitignored, currently Neon), drizzle + postgres.js + drizzle-kit, zod validation. Seed touches demo-tenant rows only.
- Single network: Base Sepolia `84532` only. All Hedera/x402/Blocky402 code is deprecated but still present — do not delete until new payment/fee contract path is specced in PROJECT.md.
- DB split: partner Neon (`DATABASE_URL` with `sslmode=require`) is remote/shared; **this device needs local DB for RAAC dev** (`DATABASE_URL=postgresql://postgres:raac@localhost:5433/raac?sslmode=disable` via `compose.yaml` `raac-pg` on 5433). Device has `postgresql@16` installed via brew (keg) and Docker 28.5.1 via orbstack (currently stopped) — either `orb start && docker compose up -d` or `brew services start postgresql@16 && createdb raac` works. Seed via `POST /api/demo/seed` or `seed()` direct. Keep tenant isolation (demo tenant only).
- `app/.env.local` currently holds Neon URL + `THEGRAPH_API_KEY` + Hedera leftovers — user will cross-check against new clean `app/.env.example:1` (required: `DATABASE_URL` + one of `THEGRAPH_API_KEY`/`AGENT0_SUBGRAPH_URL`; optional `BASE_SEPOLIA_RPC_URL` default, `BASE_SEPOLIA_PRIVATE_KEY` only at Phase 6 deployment ping). Chain constants in `app/src/server/config.ts` (`RAAC_NETWORK`, `RAAC_CHAIN_ID`).
- Contracts: no new Solidity yet; ERC-8004 identity/reputation via Agent0 subgraph on Base Sepolia. Future RAAC subgraph for `PaperSubmitted/CouncilFormed/ReviewSubmitted` events after new spec.
- Build green requires `app/.env.local` present at `next build` (DATABASE_URL required). Dir rename deferred per user — keep `cubic` path to avoid breaking tool access.
- Previous Cubic wave history (W1–W7, plan-01…plan-16, 1927 symbols, Hedera wallet `0.0.10481126`, HCS topic `0.0.10517868`) is **archived, not authoritative** — ripped base reference only.

### Important Constraints

- The Graph via Agent0/ERC-8004 is mandatory for selection — not mockable if trustless claim is to hold.
- Selection ranking must be deterministic and explainable (reputation + domain history), not LLM oracle final word per original principle.
- Detailed paper content stays off-chain private; only hashes/attestations/fee events on-chain.
- Ledger/Key Ring abstraction kept but unused for RAAC MVP unless human-in-loop approval is reintroduced for fee release.

### Known Issues / Open Questions

- Hedera code not yet pruned: `app/src/server/payments/x402.ts`, `app/src/server/config.ts` HEDERA_* defaults — keep until fee contract replaces it (other docs already purged).
- Phase 2 selector needs `THEGRAPH_API_KEY` live; mock fallback already planned for unset env.
- `MEMORY.md` history truncated intentionally — full Cubic history lives in git history pre-rip (now gone) and prior MEMORY.md backup if needed.

### RAAC Market Thesis (TAM-SAM-SOM) — Research Manuscript Submission

- **Signal (2026-09-20 live, verified):** ICLR 2027 reportedly **>60,000 abstracts registered** by abstract deadline (Digg 2026-09-20, citing submitter; prior ICLR 2026 blog: 19,525 valid submissions, 13,763 decided after 76,139 reviews from 18,054 reviewers, 5,355 accepted at 27.4% — https://blog.iclr.cc/2026/03/31/a-retrospective-on-the-iclr-2026-review-process/). The Decoder reports ~50,000 abstracts pre-deadline for ICLR 2027 vs 19,500 valid ICLR 2026 (https://the-decoder.com/ai-conference-iclr-is-drowning-in-abstracts...). If 42,300 survive to review (est. in Digg piece), reviewer pool unchanged → system breaks. ICLR 2026 also had 21% of reviews flagged fully AI-generated (Pangram Labs, 75,800 reviews), 50%+ AI-involved, plus Nov 2025 OpenReview breach exposing 45% of submissions — structural overload, not a blip.
- **TAM — Global research manuscripts:** ~3–5M peer-reviewed papers/year across all fields (STM report). Every submission needs 2–3 reviews; every review is unpaid volunteer labor. Market is the cost of review itself + downstream journals/conferences.
- **SAM — AI/ML conferences + arXiv cs.*:** ~80–120k submissions/year and spiking 60–70% YoY (ICLR 7,262→11,672→19,797 2024→2026; ICLR 2027 on track for 3×). NeurIPS 15k, ICML similar. Concentrated, measurable, on OpenReview infra.
- **SOM — A* AI venues in crisis (ICLR/NeurIPS/ICML):** ~50–60k papers/year at top-3, where reviewer disagreement SoD rose 28% (1.186→1.523 within-paper, 2025→2026) and acceptance feels like a coin flip (corr ~0.41). ICLR already caps authors at 1 paper if no qualifying publication (2026-09-02 policy) and 20-paper max — desperate throttling. First wedge: pre-screen + triage reviews for these venues + adjacent journals (TMLR). Land 2 venues, handle 10k papers at 5 reviews = 50k reviews/year where value is time saved and trust score.
- **Opportunity for RAAC:** Routing (which 5 reviewers, not random volunteers), Accountability (reputation on-chain, not anonymous one-offs), Auditable Councils (transcript + 5 independent scores + hash anchored). ICLR's own caps prove demand for infrastructure, not more volunteers.

### MVP Plan (Long-Term, Crash-Resilient) — This IS the Legacy

Goal: shippable RAAC peer-review MVP on this repo, 80% reuse of Cubic base (see § What Was Ripped). Single network, no new chain.

#### Reuse vs New (80/20 split)

- **Reuse 80% (no redesign, copy contract):** monorepo/pnpm/Next.js/drizzle-orm/postgres/zod/viem/The Graph client/ERC-8004 registry lookup/Agent0 subgraph/MCP facade/event bus (17 types) → extend to paper events/capability (council mandate)/SSE network viz/`MacWindow` + monochrome design/seed + health + audit/trace routes.
- **New 20% (must build):** paper domain model + selector ranking (§5) + EIP-712 signature gate + council orchestration (A2A discussion then 5 parallel `review.paper` calls) + review rubric + Base Sepolia fee escrow + hash anchoring + Global Review Network re-pivoted from intents-evaluated to papers-reviewed. Deprecate but do not yet delete Hedera/x402/Ledger scanner code — keep until fee contract replaces it.

#### Phases — UI-FIRST REORDER (2026-09-21 per user, old plan archived below) — Phase 1 DONE

- **Phase 0 — Spec lock (DONE):** PROJECT.md/AGENTS.md/DESIGN.md/MEMORY.md/docs all RAAC-canonical. Build green. This file is the handoff.
- **Phase 1 — Domain schema (DONE 2026-09-21):** `papers`/`paper_councils`/`council_messages`/`reviews`/`paper_fees` in `schema.ts:190`, migration `0002_flaky_blizzard.sql`, events `paper.*` + `council.*` + `review.submitted`, seed paper `zl-421`. Build 14 routes, 2 seed tests pass.
- **Phase 2 — UI shell (NEXT, 1–2 days, mock data):** `/papers` (submit placeholder → `papers` table), `/papers/[id]` (paper + mock top-5 selection + council transcript placeholder + 5 review cards), `/network` re-pivoted to `papers reviewed / councils active / reviews` counters, `/console` → paper admin. Monochrome + `MacWindow` per `DESIGN.md`. First committable RAAC surface — no selector logic yet (fixture scores 0.94→0.85).
- **Phase 3 — Selector (ranking):** `app/src/server/selector/` Graph query Base Sepolia, `0.5*overall+0.4*domain+0.1*recency`, top-5 + explainability, `POST /api/papers/:id/selection` — UI swaps mock for live.
- **Phase 4 — Fee + signature gate:** `BASE_SEPOLIA_RPC_URL` fee verify, escrow row, EIP-712 `CouncilFormation`, `verifyTypedData`.
- **Phase 5 — Council orchestration:** `council/orchestrator.ts` bounded discussion (20 msgs) → 5× `review.paper` (mock LLM then MCP/A2A), SSE to `/network`.
- **Phase 6 — Anchoring + audit:** `keccak256` review hashes + Base Sepolia tx placeholder + `GET /api/audit/trace/:paperId` full chain.
- **Phase 7 — Demo + adversarial:** `pnpm demo:raac` + adversarial fixtures (low-rep excluded, unsigned blocked).
- **Phase 8 — Polish + TAM proof:** ICLR band `19,525→60k→42k` in market section, Graph live verify page, then prune Hedera code.

#### Old plan (archived, replaced by UI-first above)



- **Phase 0 — Spec lock (DONE):** PROJECT.md/AGENTS.md/DESIGN.md/MEMORY.md/docs all RAAC-canonical. Build green. This file is the handoff.
- **Phase 1 — Domain schema (foundation, 1–2 days):** extend `app/src/server/db/schema.ts` (new tables `papers`, `paper_embeddings`, `councils`, `council_messages`, `reviews`, `paper_fees`; or repurpose `tasks→papers`, `councils` already exists, `capabilities` → council mandate). Migration + seed Astra Lab demo paper + 5 agents (84532:*). Add event types `paper.submitted`, `agents.ranked`, `council.proposed`, `signature.verified`, `council.opened`, `discussion.message`, `review.submitted` (extend `events/types.ts` beyond 17, keep old events for compat). No UI yet.
- **Phase 2 — Selector (ranking, 2–3 days):** implement `app/src/server/selector/` — The Graph query (Agent0 Base Sepolia, same `THEGRAPH_API_KEY`/`AGENT0_SUBGRAPH_URL`), scoring `0.5*overall +0.4*domain +0.1*recency - penalty`, validation gate, deterministic top-5 + explainability payload. Keep mock fallback if env unset. Unit-test with fixture agents (0.94/0.91/… + negative lab-1). Route: `POST /api/papers/:id/selection`.
- **Phase 3 — Fee + signature gate (1–2 days):** `BASE_SEPOLIA_RPC_URL` verify fee tx (viem `getTransaction`), escrow row, `POST /api/councils/propose`, EIP-712 `CouncilFormation` schema, `viem verifyTypedData` against author address, `POST /api/councils/:id/open`. No fee movement yet — escrow is row + tx ref; on-chain contract later if funding exists.
- **Phase 4 — Council orchestration (3–4 days, core):** orchestrator in `app/src/server/council/orchestrator.ts` — given 5 agents, send paper context, collect bounded discussion (N=20 messages or timeout), store transcript, then parallel `review.paper` (existing executor pattern, new `review.ts` executor, mock LLM in MVP, real agent via MCP/A2A later). Store 5 reviews with rubric `score 1-10 + strengths/weaknesses/questions + hash`. Events + SSE to `/network`. Route: `GET /api/councils/:id` + transcript stream.
- **Phase 5 — Anchoring + audit (1 day):** hash each review (`keccak256`), batch tx on Base Sepolia (or single tx with 5 hashes if contract ready else store tx_hash placeholder + show Basescan link shape). `GET /api/audit/trace/:paperId` returns full chain paper→selection→signature→council→reviews. HCS/ledger anchoring code stays deprecated.
- **Phase 6 — Author + Network surfaces (2–3 days):** `/papers` (submit, pay help, sign, track council) + `/papers/:id` (paper + selection + council + 5 reviews) + rebuild `/network` from `intents` to `papers/councils/reviews` counters (1,842 agents → same, but 24,921 papers reviewed, 23,884 reviews, 123 councils active per `HeroCopy.tsx` already flipped). Keep monochrome/MacWindow per `DESIGN.md`. Existing console (`/console`) becomes paper admin.
- **Phase 7 — Demo + adversarial (1 day):** script `pnpm --filter app demo:raac` — submits Astra Lab paper `zl-421`, prints selection scores, signature, transcript snippet, 5 review scores, Busescan links. Adversarial fixtures: low-rep agent excluded, out-of-domain agent not picked, unsigned council blocked, fee mismatch rejected. Docs `docs/demo.md` updated from spec to runbook.
- **Phase 8 — Polish + TAM proof (1 day):** wire real ICLR stat band (19,525 → 60k → 42k through review) into landing's market section, add Graph live verification page (same pattern as old `agents-profile.test.ts` pseudonym salt). Delete Hedera code only after fee contract is specced/tested. Full suite green.

#### Invariants for any new agent resuming after crash

- Read order: `PROJECT.md` → `DESIGN.md` → this file (this section is the plan).
- Never reintroduce Hedera/x402/Blocky402; never make LLM the final ranker; keep papers off-chain, hashes on-chain.
- `app/src/server/config.ts` single network: `RAAC_NETWORK=base-sepolia`, `RAAC_CHAIN_ID=84532`, `BASE_SEPOLIA_RPC_URL`. `THEGRAPH_API_KEY` or `AGENT0_SUBGRAPH_URL` engages live ranking.
- Schema is frozen after Phase 1 — no second migration without explicit user sign-off.
- After each phase, update this file's Active Work checkboxes and Recent Changes, and verify `pnpm --filter app build`.

#### Estimated effort

7–12 days solo, or 4 parallel tracks (selector, signature, council, UI) in 3–4 days with subagents. Base Infra 80% already green — value is in selector + council, not framework.

### Recent Changes

- **2026-09-21 rebrand+network lock (no dir rename):** reinit git (no upstream), Logo/hero/manifesto/details/FAQ/marquee/footer/DESIGN.md/compose/package.json/env.example/config all flipped to RAAC/Base Sepolia. Build verified green (14 routes). The Graph confirmed retained for RAAC selector.
- **2026-09-21 docs purge + ICLR signal ingest:** PROJECT.md/AGENTS.md/docs all rewritten to RAAC (see Recent Changes above). Web search completed: ICLR 2027 >60k abstracts (Digg 2026-09-20), ICLR 2026 19,525 valid (ICLR blog 2026-03-31), 21% AI-generated reviews (Pangram Labs), new submission caps (ICLR caps new authors at 1 paper — Quasa 2026-09-06). TAM-SAM-SOM synthesized from that signal in this file.
- **2026-09-21 RAAC expansion locked:** Routing, Accountability, Auditable Councils. MVP plan written here as crash-resilient legacy.

### Recent Changes (Archived Cubic — pre-rip, for reference only)

- Cubic waves W1–W7 + plan-11…16 merged, Hedera HBAR settlements verified, LangSmith live leg green, etc. — see git pre-rip or ask user for backup. Not authoritative for RAAC.
