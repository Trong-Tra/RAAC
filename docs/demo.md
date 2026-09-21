# RAAC demo — runbook (paper → 5 reviews)

> **Cubic demo below is archived.** This file now describes RAAC on Base Sepolia. Hedera/Blocky402 steps are deleted.

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
- [ ] Seed: `curl -X POST http://localhost:3000/api/demo/seed`

## Commands

```bash
pnpm dev
open http://localhost:3000/papers/demo
# submit → sign → watch council → reviews

# full API trace
curl http://localhost:3000/api/audit/trace/<paper_id> | jq .

# network SSE
curl http://localhost:3000/api/network/stream
```

## What the script will do (planned)

1. `POST /api/papers/submit` → paper submitted, fee verified.
2. `GET /api/papers/:id/selection` → top 5 with scores.
3. `POST /api/councils/propose` → council pending signature.
4. `POST /api/councils/:id/open {signature}` → council active.
5. Council discussion (A2A, N messages) → transcript.
6. `POST /api/reviews` ×5 → reviews + hashes on Base Sepolia.
7. Fee released, paper completed.

*Not yet implemented — this runbook is the spec for the demo to be built off new PROJECT.md.*
