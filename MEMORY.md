# MEMORY.md

## Purpose

Hot working memory: implementation state, decisions, tasks, constraints, discoveries, unresolved questions. Read at the start of every substantive task; update when state changes. Concise facts over prose. Mark stale facts rather than silently deleting history.

## Current State (2026-11-03, post lexicon redesign)

### 2026-11-03 Lexicon Redesign (verdict: SHIP)

Full UX redesign via the `impeccable` skill for the Eureka education/science track — replaced the monochrome "industrial cool" world with a bright scholarly one: **"Nineteenth-century lexicon page"** (`rw-lexicon-shoulder-and-plate`, seed `seed:709395222734454b`, key `98adb0e8f02ede8afd1cff391edfd748`). **DESIGN.md is rewritten and canonical** — read it before any UI work; `app/.impeccable/design.json` mirrors the tokens.

- **Tokens** (`app/src/app/globals.css`): cream `--paper #f4efe4`, ink `#1a1712`, vermilion `#b7341f` (live action only), five examiner mineral inks (ultramarine/emerald/madder/sepia/violet), `--chrome #8a680b`, `--ink-faint #6f6757` (contrast floor — don't lighten). Source Serif 4 + Courier Prime via next/font in `layout.tsx`; **mono is reserved for codes/hashes/scores** — buttons are serif small-caps 700.
- **New IA:** `/console` is the product (renamed from `/app`, 2026-11-04) — guided journey (submitted→ranked→signed→council→anchored) with shoulder index, one live action per state, Routing (mark scales in examiner inks), Council plate, Marginalia, margin plates (Anchoring, Index of entries). **Old `/console` power-user area deleted** (redirect + papers/audit/settings + wallet-gate layout — subsumed by the product page). `/papers` → redirects to `/console`; `/papers/[id]` is the reading page; **`/catalogue` is the public entry shelf** (any wallet can read); landing rewritten for judges; `/network`, `/faq` re-themed light.
- **Deleted:** 11 dark-world components (MacWindow, HeroCopy, Manifesto, TeamSection, PartnerMarquee, DetailsSection, MarketSection, Closer, CloserCanvas, NetworkCanvas, DitherImage). MacWindow chrome rule in old DESIGN.md is **void**.
- **Finish review (impeccable-finish-reviewer): verdict SHIP.** All 6 findings fixed: FAQ rewritten to real mechanism (no VRF/ERC-5192/721); **reviews↔examiners paired by identity** (`agents.id→agentKey` map + `reviewFor()`; queries `orderBy(asc(reviews.createdAt))` in `api/papers/[id]`, `council/run`, `anchor`); mobile nav ≤640px wraps to second row; buttons serif small-caps; contrast tokens fixed; captures rechecked in `app/.impeccable/review/`.
- **Verified green:** typecheck clean, `next build` 25 routes no lint warnings, tests 9/9, `impeccable detect --json` → `[]`.
- **Demo papers (2026-11-04):** Attention paper **gone** — shared Neon was fully dropped (`DROP SCHEMA public CASCADE` + journal reset + migrate) and reseeded (tenant `demo`, 6 agents, 0 papers). Five niche papers staged locally (intake→rank→EIP-712 signed→council→**completed: 25 live reviews, 0 mock**, all `FULL_JSON`): crypto `2402.03196`, ml `2409.01635`, bio `2403.09182`, econ `2301.13794`, systems `2408.04238` — staging/refresh scripts are local-only (git-ignored, see `.gitignore`). Running `pnpm --filter @raac/app test` still wipes papers on shared Neon — re-stage after any test run.
- **Landing v2 (2026-11-04):** hero now pairs the headword with `SittingSpecimen` (animated five-ink council loop, clearly captioned "specimen"); new "Why this volume exists" problem section (overload/distrust/opacity + Plate ii sourced evidence: ICLR 2026 76,139/18,054, Pangram 21%, OpenReview breach 45%); **"The compilers" team section + `CompilerPortrait` component + `public/dev_imgs/` deleted (user verdict: looks bad)**; `motion` dependency added (`Reveal` scroll-in, `CountUp` numerals); hero layout is `.hero-grid` in globals.css.
- **Screenshot gotcha:** Playwright `--full-page` captures leave motion `whileInView` sections blank (they never intersect) — use a scroll-through capture script instead (`/tmp/raac-capture.cjs` pattern: scroll through, back to top, then full-page shot).
- **Remaining polish (non-blocking):** council-running/anchored states intentionally uncaptured (live demo).

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
4. **Council** — `app/src/server/council/orchestrator.ts` `runCouncil()`: resumable; **single-flight on `globalThis.__raacCouncilRuns`** (survives Next route-handler module isolation — verify + run routes share one lock; concurrent POSTs join the same promise); **re-checks DB before every LLM call** + unique-violation insert → skip (no double-billing); discussion messages are deterministic templates; reviews are live OpenRouter `:free` calls with per-agent personas, 7-section academic JSON, ar5iv full-text fetch, multi-key fallback, `academicMockFor` when rate-limited — **max 2 attempts × 2 keys = 4 calls/agent ceiling** (was 3×N — caused ~59 req on one paper: double-run × retries). Full JSON rides in `reviews.summary` after `FULL_JSON:`. **Auto-starts after EIP-712 verify** (background `void runCouncil`); console auto-POSTs once per paper when active with <5 reviews (ref does not reset on flicker). No manual "Convene/Resume" click required.
5. **Anchoring** — `app/src/server/anchors/base.ts`: per-review 0-value self-tx `data=0x<reviewHash>` on 84532, `anchorTxHash` + Basescan links. Deployer wallet `0x7EA6…F1F2` (key in `.env.local`).
6. **Review intake hardening (2026-11-05):** `normalizeContent()` handles parts-array/null/object OpenRouter content; abort **120s**, `max_tokens=8000` (2500 truncated the 7-section JSON); stored review JSON no longer `.slice()`-truncated (full body rides `FULL_JSON:`; `parseFullJson` regex-falls-back for older rows, missing recommendation recovered from score bands); unique-insert catch matches SQLSTATE `23505` + constraint name (postgres-js often omits "unique"); **a council completes only when all 5 reviews are non-mock** — 429 fallback rows don't mark completed, so a later resume refills those slots with live reviews.

### Surfaces (lexicon world, 2026-11-03)

- `/` landing — hero "Peer review, set in type.", three definitions (routing/accountability/auditable councils), live volume stats plate, CTA to `/console`.
- `/console` — **the product surface** (renamed from `/app` 2026-11-04): submit plate when empty, else the entry with one live action, Routing rows (mark scales in examiner inks), Council plate (5 examiners, reports, median), Marginalia (discussion), margin plates (Anchoring + Index of entries). `?paper=<id>` selects an entry. Old power-user console (papers/audit/settings) deleted.
- `/papers` → redirects to `/console`. `/papers/[id]` — reading page: selection math, transcript, full 7-section reviews in examiner inks, ANCHOR + Basescan.
- `/catalogue` — **public shelf of all entries** (added 2026-11-04): no wallet required; lists every paper with domain, status, score chips, median verdict, anchor count; filter all/published/in review. Served by `GET /api/network/catalogue` (papers + council + reviews join). Nav: Console · Catalogue · Network · FAQ.
- `/network` — stats, AgentWorldMap (react-simple-maps, node size ∝ `agents_registered`, local `public/geography/countries-110m.json`), COUNCIL FABRIC, PIPELINE, SSE event stream. Light lexicon theme.
- `/api/graph/verify` kept — live ERC-8004 subgraph verification endpoint.
- **Favicon (2026-11-06):** tab icon = the logo's vermilion diamond on cream — `src/app/icon.svg` + `favicon.ico` (16/32/48) + `apple-icon.png` (180); Next file conventions auto-link all three. Generate recipe: `/tmp/gen-icons.py` pattern (supersampled polygon, `--paper`/`--vermilion` token RGBs).

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
- Local-only experiments: deliberately **git-ignored** (see `.gitignore`) — never commit, deploy, or reference them in product surfaces or docs.

### RAAC Market Thesis (TAM-SAM-SOM)

- **Signal:** ICLR 2027 ~50–60k abstracts vs 19,525 valid submissions ICLR 2026 (ICLR blog 2026-03-31: 76,139 reviews from 18,054 reviewers, 5,355 accepted). 21% of ICLR 2026 reviews fully AI-generated (Pangram, arXiv 2607.27183). Nov 2025 OpenReview breach exposed ~45% of submissions. ICLR caps new authors at 1 paper.
- **TAM:** ~3–5M peer-reviewed papers/yr (STM). Every submission needs 2–3 unpaid reviews.
- **SAM:** ~80–120k AI/ML conference + arXiv cs.* submissions/yr, 60–70% YoY growth.
- **SOM:** ~50–60k papers/yr at ICLR/NeurIPS/ICML — first wedge: pre-screen + triage councils. Value = time saved + trust score.
- **Pitch:** Routing (which 5 reviewers), Accountability (on-chain reputation), Auditable Councils (transcript + independent scores + anchored hashes).

### Demo Runbook (short)

1. `pnpm --filter @raac/app dev` (needs `.env.local`: DATABASE_URL, THEGRAPH_API_KEY or AGENT0_SUBGRAPH_URL, OPENROUTER_API_KEY(+fallbacks), BASE_SEPOLIA_PRIVATE_KEY for sign/anchor).
2. The five demo papers are pre-staged and **completed** (5 councils, 25 live reviews, 0 mock). Refresh/staging scripts are local-only (git-ignored). `/console` is wallet-gated — connect the author wallet (`0x7EA6…F1F2`) to see them.
3. `/papers/[id]` shows selection math, transcript, paginated full 7-section reports, Basescan links. `/network` shows counters + fabric + world map. Detail: `docs/demo.md`. Verify: `pnpm --filter @raac/app build && pnpm --filter @raac/app test` (9/9 — **wipes papers on shared Neon**).

- **UI copy pass (2026-11-05):** All "Plate i./ii./0." captions removed across the app — `Plate` captions are plain descriptive labels only; `plateNo` keeps live metadata (median, counts). Verify: tsc ✓, next build ✓.

- **Foundation research (2026-11-05):** Landing now cites the backing paper — *Verifiable AI Reviewers: Decentralized Skill Matching and Soulbound Reputation for Multi-Agent Peer Review* (Trong, Huynh, Nhi, Nguyen, Tai, Minh, Tran, Pham), **2026 International Conference on Multimedia Analysis and Pattern Recognition (MAPR)**, DOI `10.1109/MAPR72750.2026.11685704`, IEEE Xplore `11685704`. Placement: hero definition footnote (title link + mono DOI + author line, "foundation research · IEEE MAPR 2026") + one-line colophon credit. Framing: the framework RAAC builds on, published at an international conference.

- **Console wallet gating + scoped entries (2026-11-05):** `/console` is now gated on a connected wallet. `WalletProvider` exposes `ready` (false until initial `eth_accounts` restore settles; true immediately with no injected wallet) — no connect-flash for returning users. Disconnected → guide-line + one centred Plate card ("Connect a wallet to access your console." + vermilion connect + "read the public shelf →" `/catalogue`); no journey grid, no fetch, `submitArxiv` guarded on address. Connected → index fetched via **`GET /api/papers?author=`** (route matches `lower(authorAddress) = lower(?)` — checksummed addresses); `loadPapers` early-returns (clears list) without address; `loadDetail` rejects any paper whose `authorAddress` ≠ connected address (clears detail+selection); effects keyed `[ready, address]` load, `[address]`/`[selectedId, address]` clear-on-switch. Wallet A never sees wallet B's entries; `/catalogue` stays the public shelf.
- **Console layout fix (2026-11-05):** the margin column stretched past the measure (45px horizontal scroll at 1440 in detail state). Cause: `.journey-margin` inline `display:grid` → implicit `auto` track sized to min-content of Index nowrap titles (~566px), and the Index's inner list was a second auto track. Fix: `gridTemplateColumns: "minmax(0, 1fr)"` on `.journey-margin` (console + `/papers/[id]`) and the Index/Anchoring inner lists, `minWidth: 0` on index buttons, plus `globals.css` `.journey-grid > *, .journey-margin > * { min-width: 0 }`. Verified **0 overflow at 1440/1101/760/390** (Playwright bounding-box sweep, gated + connected + detail); screenshots clean desktop/mobile. DESIGN.md journey-grid rule updated to require `minmax(0,1fr)` for nested journey grids.
- **Verify (2026-11-06):** `tsc --noEmit` ✓ · `next lint` ✓ **0 warnings/errors** (3 stale `eslint-disable` directives removed) · `next build` ✓ (`/console` 8.14 kB, icon routes emitted, built HTML links favicon.ico + icon.svg + apple-touch-icon).
- **Production deployment (2026-11-06):** runbook = **`docs/DEPLOYMENT.md`** (accounts → migrate/provision → relayer wallet → Vercel env → smoke checklist → third-party disclosure). Stack: **Vercel hosts UI *and* API** (Root Directory `app`, monorepo), **Neon** Postgres (pooled URL in Vercel, direct URL for `db:migrate`), **OpenRouter** for reviews, **The Graph** gateway key for live ERC-8004 ranking (static fallback if unset), **Base Sepolia** public RPC + dedicated faucet-funded relayer wallet for anchors; no contracts, no object storage. Fresh DB needs `DATABASE_URL=… db:migrate` + **`scripts/provision.ts`** (new seedRoster CLI — idempotent tenant+6-agent roster) or intake 500s "demo tenant missing". Vercel fluid-compute 300 s default=max (Hobby) covers a council sitting; runs are resumable (reopen console); `run`/`anchor` endpoints unauthenticated — demo-grade, flagged in runbook §7. **Vercel is the only new account** — Graph/OpenRouter/relayer keys mirror `app/.env.local` verbatim (Graph is runtime-called, nothing to provision); DB is Path A (paste shared Neon, skip migrate/provision, never `pnpm test` while prod points there) or Path B (fresh DB on same Neon → migrate + provision). **Measured sizing 2026-11-06:** shared DB = 9.7 MB total; review row avg 6.7 KB / max 8.4 KB, council msgs 170 B, audit+network events 224 KB → Neon Free (1 GB/project, 100 CU-h, scale-to-zero) has ~100× headroom; 100k reviews ≈ 0.7 GB; growth trigger is append-only event logs, not reviews (PDFs never stored — architecture rule).
