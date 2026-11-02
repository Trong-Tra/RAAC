# Fee flow — paper submission on Base Sepolia (RAAC)

> RAAC uses one network only: Base Sepolia (84532).

## Architecture

```text
author (wallet on Base Sepolia)
   │ ① submit paper + fee_tx_hash
   ▼
RAAC GATEWAY — verify fee tx on BASE_SEPOLIA_RPC_URL
   │ escrow fee (contract holds)
   ▼
PAPER row (hash, domain, status=submitted) + paper.submitted event
   │
   │ ② selector queries The Graph (Agent0 / ERC-8004 on 84532)
   ▼
RANKING — reputation + domain history → top 5
   │ selection_decision + council_proposed
   ▼
author signs EIP-712 CouncilFormation(selection_hash)
   │ ③ verify signature → council row (members[5], signature)
   ▼
COUNCIL OPENED — 5 agents get paper context via A2A/MCP
   │ discussion (transcript stored off-chain)
   ▼
5× review.paper → independent reviews stored, hashes anchored on Base Sepolia
   │ review_submitted (×5) + hash anchoring txs
   ▼
FEE RELEASE — escrow split to 5 reviewers, paper → completed
```

## Setup

```bash
pnpm install
pnpm db:migrate
pnpm dev # http://localhost:3000
curl -X POST http://localhost:3000/api/demo/seed
```

### Environment (`app/.env.local`, never committed)

| Variable | Meaning |
|---|---|
| `DATABASE_URL` | shared PostgreSQL |
| `BASE_SEPOLIA_RPC_URL` | Base Sepolia RPC (default `https://sepolia.base.org`) |
| `RAAC_NETWORK` | `base-sepolia` |
| `THEGRAPH_API_KEY` / `AGENT0_SUBGRAPH_URL` | live reputation source — either engages Graph ranking |
| `REVIEW_FEE_WEI` | fee amount for demo (e.g. `1000000000000000` = 0.001 ETH) |

No `HEDERA_*`, no `X402_*`, no Blocky402.

## Exact sequence (RAAC MVP demo)

1. `POST /api/papers/submit {paper_hash, abstract, domain, fee_tx_hash}` → verify tx on Base Sepolia → paper `submitted`.
2. Selector ranks agents via The Graph (see `PROJECT.md §5`): `score = 0.5*overall + 0.4*domain + 0.1*recency - penalty`. Top 5 returned with scores.
3. `POST /api/councils/propose {paper_id, selected[5], selection_hash}` → author signs EIP-712.
4. `POST /api/councils/:id/open {signature}` → verify → council `active` → agents discuss.
5. `POST /api/reviews {council_id, agent_id, content}` (×5, agent-signed) → hashes anchored on Base Sepolia → `review.submitted`.
6. Fee released, `paper.completed`, all queryable via `GET /api/audit/trace/:paper_id`.

## Security properties

- Paper content stays off-chain; only `sha256(paper)` and `sha256(review)` on-chain.
- Selection is deterministic and explainable (scores + domain counts exposed).
- Fee escrow is on-chain; no review is accepted before signature verification.
- Ranking source is The Graph (on-chain reputation), not a private DB sort.

## Notes

Fee escrow is currently a DB row + verified tx ref; the escrow contract lands in `contracts/` when specced. Review anchoring lives in `app/src/server/anchors/base.ts`.
