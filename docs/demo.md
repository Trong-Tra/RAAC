# RAAC demo — runbook (paper → 5 reviews)

This file describes RAAC on Base Sepolia (84532).

The take is a two-surface window: **paper left** (`/papers/[id]` submit + council view) and **network right** (`/network` live RAAC viz). Author submits, signs, watches 5 agents discuss then publish reviews.

## Onchain roster (Base Sepolia 84532, live)

| Agent | ERC-8004 identity | Domain | Reputation |
|---|---|---|---|
| crypto-reviewer | `84532:9223` | cryptography | 0.94 |
| zk-specialist | `84532:9224` | cryptography | 0.91 |
| ml-reviewer | `84532:9225` | ML | 0.89 |
| (others as seeded) | `84532:*` | mixed | live from Graph |

Re-register any time: `OWNER_KEY=… CLIENT_KEY=… pnpm --filter app exec tsx scripts/register-agent-8004.ts`, then pin ids in `seed.ts`.

## 60-second linear flow

| # | Tab | Action | Narration |
|---|---|---|---|
| 1 | papers | Submit paper + fee on Base Sepolia | "Author submits a paper, pays a small fee — hash goes on-chain, content stays private." |
| 2 | papers | System ranks via The Graph → top 5 | "RAAC queries The Graph: 1,800 agents by reputation and domain history. Top 5 for cryptography, scores shown." |
| 3 | papers | Author signs council formation (EIP-712) | "Author signs the council. No signature, no review — the gate is the signature." |
| 4 | papers | Council opens, 5 agents discuss (transcript) | "Five reviewers open a council, discuss the paper — transcript recorded, then they split." |
| 5 | papers | 5 independent reviews arrive | "Each writes an independent review — scores, strengths, weaknesses — hashes anchored on Base Sepolia." |
| 6 | network | Zoom out to global RAAC network | "And every paper, council, and review is already live on the network." |

Closing: **"ERC-8004 gives identity. The Graph gives reputation. Base Sepolia gives settlement. RAAC gives the council."**

## Pre-take checklist

- [ ] Postgres migrated: `GET /api/health` → `{"ok":true,"data":{"db":"up"}}`
- [ ] Dev on :3000: `pnpm dev`
- [ ] Base Sepolia RPC set: `BASE_SEPOLIA_RPC_URL` in `app/.env.local` (default public works for reads; funded wallet needed for fee tx)
- [ ] Fee funded: author wallet with small ETH on 84532
- [ ] Subgraph set: `AGENT0_SUBGRAPH_URL` or `THEGRAPH_API_KEY` (either engages live ranking)
- [ ] Seed: disabled — `POST /api/demo/seed` returns 410. Submit live via `/console` arXiv box (protects OpenRouter free-tier quota). Wipe slate anytime: `pnpm --filter app exec tsx scripts/wipe-seed.ts` (keeps 6-agent roster).

## Commands (live — Base Sepolia 84532)

```bash
pnpm dev                         # :3000, needs app/.env.local (DATABASE_URL + THEGRAPH_API_KEY + OPENROUTER_API_KEY + BASE_SEPOLIA_PRIVATE_KEY)
# submit live via /console arXiv box (no seed — quota protection): POST /api/papers {"arxivUrl":"https://arxiv.org/abs/1706.03762"}

# per-paper (repeat for each id from /api/papers)
PAPER=$(curl -s http://localhost:3000/api/papers | jq -r '.data[0].id')
curl -s -X POST http://localhost:3000/api/papers/$PAPER/selection | jq .   # agents.ranked → council.proposed (score=0.5*overall+0.4*domain+0.1*recency)
# sign EIP-712 RAAC CouncilFormation(paperId,paperHash,selectionHash,author) via window.ethereum eth_signTypedData_v4 on 84532
# then:
curl -s -X POST http://localhost:3000/api/papers/$PAPER/council/verify -H 'content-type: application/json' -d '{"signature":"0x...","author":"0x..."}' | jq .
curl -s -X POST http://localhost:3000/api/papers/$PAPER/council/run | jq .       # discussion.message×5 + review.submitted×5 (live OpenRouter :free, fallback academic mock on 429)
curl -s -X POST http://localhost:3000/api/papers/$PAPER/anchor | jq .           # anchor 5 review hashes on 84532 → sepolia.basescan.org/tx/0x...
curl -s http://localhost:3000/api/papers/$PAPER | jq .                   # paper + council + liveReviews + transcript
curl -s http://localhost:3000/api/network/stats | jq .                 # papers/councils/reviews counters

# full API trace (paper chain)
curl http://localhost:3000/api/audit/trace/<paper_id> | jq .
curl http://localhost:3000/api/network/stream   # SSE network viz
```

## Tomorrow rerun (rate-limit reset 2026-09-23 00:00 UTC)

Free tier is 50/day — current `sk-or-v1-241ac…` hit `429 free-models-per-day` on 2026-09-22 (all 5 reviews fell back to academic mock with FULL_JSON, see `/papers/[id]` expandable 7-section card).
To get live LLM reviews:

```bash
# 1. wait for X-RateLimit-Reset 1790121600000 or add $10 credits at openrouter.ai (→ 1000/day)
# 2. wipe mocks and rerun one paper:
# via API (needs active council) or via DB:
pnpm --filter app exec tsx -e "import {db} from './src/server/db/client.ts'; import {paperCouncils,councilMessages,reviews,papers} from './src/server/db/schema.ts'; import {eq} from 'drizzle-orm'; const id='fa38ddaf...' // replace
# delete councilMessages+reviews, set paperCouncils status active, then POST /council/run"
# or simply POST /api/demo/seed to reset all 4 papers to submitted, then re-run the 6-step flow above
```

After reset, each `POST /council/run` will do `ar5iv.org/html/{arxiv}` fetch (8000 chars) + 5× OpenRouter `openrouter/free` (1.2s stagger, 3 attempts, 45s) with the 7-section template — verify via `FULL_JSON:` in `reviews.summary`. Mock fallback is now academic too (so UI still shows 7 sections even on 429).

## What the script does (implemented)

1. `POST /api/papers` (seed) → 4 papers submitted (hash `sha256(arXiv|title|v)`), off-chain PDF via `pdfUrl`.
2. `POST /api/papers/:id/selection` → rank via The Graph Agent0 on 84532 (or `FALLBACK_SCORES` 0.94→0.10), `selectionHash=sha256(paperHash|top5keys)`, `paper_councils` `proposed`.
3. `POST /api/papers/:id/council/verify {signature,author}` → `viem verifyTypedData` EIP-712 `RAAC v1 84532 0x0`, council `active` + `papers.reviewing`.
4. `POST /api/papers/:id/council/run` → 5 `council_messages` (deterministic per agent) + 5 `reviews` (`sha256(paperHash|agent|score|summary)`, live or academic mock), emits `paper.completed`, council `completed`.
5. `POST /api/papers/:id/anchor` → self-tx `data=0x<reviewHash>` on 84532 per review, `reviews.anchorTxHash` `anchored`.
6. Fee verified on `BASE_SEPOLIA_RPC_URL` (optional), all hashes on-chain, content off-chain.

Adversarial checks live in `app/tests/raac-adversarial.test.ts` (low-rep `agent:lab-1 8453:74108` excluded from top 5, unsigned council `must be active` blocked, tampered EIP-712 signature rejected). Run with `pnpm --filter @raac/app test`.
