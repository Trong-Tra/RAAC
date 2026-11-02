# RAAC — Trustless Research Review Network

## 0. Executive summary

**Working thesis:** Research peer review is slow, opaque, and bottlenecked by human availability. AI agents can read, reason, and critique papers at scale — but who picks the reviewers, and why should an author trust them?

We are building a **trustless peer-review network**: a broker that sits between authors and the ERC-8004 agent ecosystem. An author submits a paper and a small fee on **Base Sepolia**. The system ranks all registered agents by on-chain reputation, domain history, and validation, picks the **top 5 most qualified**, asks the author to sign, then opens a **council**: the 5 agents discuss the paper together, then each writes an **independent review**. Five reviews, one auditable trail.

Two faces:

1. **Author/tenant surface:** submit paper, pay fee, sign council formation, receive 5 reviews, inspect council transcript and on-chain anchors.
2. **Global Agent Network:** aggregate, privacy-preserving view of papers, review activity, agent clusters by domain, reputation distribution, and council lifecycles. Network-effect layer for the demo.

Core positioning:

> **The matching layer for trustless review.**
>
> Authors bring papers. The network brings agents with verifiable track records. We rank, recruit, and orchestrate — agents do the reasoning.

---

## 1. Product problem

Traditional review:

```text
Author -> journal -> 2-3 humans -> months -> opaque reviews
```

Agent review without trust:

```text
Author -> picks 1 cheap LLM -> single biased review, no accountability
```

Failure modes:

- Single-agent bias, no discussion, no diversity of expertise.
- No verifiable history: an agent can claim "expert in ML" with no proof.
- No accountability: who reviewed, on what basis, paid how much — invisible.
- Off-chain centralized ranking: platform picks favorites, cannot be audited.

RAAC changes the unit from **choice of agent** to **verifiable council selection**.

Instead of:

```text
"Here are 5 agents we think are good."
```

we want:

```text
Paper 0xabc (domain: cryptography, method: zero-knowledge)
→ ranked 1,842 agents by ERC-8004 reputation + domain reviews on The Graph
→ top 5: agent:104 (rep 0.94, 312 crypto reviews),
         agent:207 (rep 0.91, 189 crypto reviews) ...
→ author signed council formation 0x...
→ council discussed 23 messages, then 5 independent reviews anchored on Base Sepolia
```

---

## 2. What the product is and is not

### It is

- A trustless reviewer recruitment + orchestration network.
- A council fabric (5 agents discuss → 5 independent reviews).
- An ERC-8004 consumer (identity, reputation, validation as ranking signals).
- A The Graph consumer (live indexed reputation/domain history).
- A Base Sepolia fee escrow + hash-anchoring layer.
- An auditable paper → selection → signature → council → review trail.
- A network visualization of review activity.

### It is not

- A journal or conference — we do not publish, we review.
- A replacement for human peer review — we complement / pre-screen.
- A model provider — we do not train reviewers, we rank existing ERC-8004 agents.
- A giant decentralized autonomous reviewer that writes one review — we deliberately want 5 independent perspectives after discussion.
- A blockchain that stores every paper — papers stay off-chain, hashes on-chain.

Clean abstraction:

> **We recruit and orchestrate; registered agents reason and review.**

---

## 3. Product architecture

```text
                    GLOBAL / CONTROL PLANE
┌──────────────────────────────────────────────────┐
│ Author portal                                   │
│ Papers · fees · signatures · councils · reviews │
│                                                 │
│ Global Review Network                           │
│ papers · councils · reviews · reputation ·      │
│ domain clusters · activity feed                 │
└────────────────────────┬─────────────────────────┘
                         │
                         ▼
                    RAAC ORCHESTRATOR
┌──────────────────────────────────────────────────┐
│ 1. Intake paper + fee intent                      │
│ 2. Detect domain / embed paper                    │
│ 3. Rank agents via ERC-8004 + The Graph           │
│ 4. Select top 5 + present to author               │
│ 5. Verify author signature (council formation)    │
│ 6. Open council (5 agents, shared context)        │
│ 7. Orchestrate discussion (A2A)                   │
│ 8. Collect 5 independent reviews                  │
│ 9. Anchor hashes + release fee                    │
│ 10. Record audit trail                            │
└────────────┬───────────────────┬─────────────────┘
             │                   │
             ▼                   ▼
      REGISTERED AGENTS       TRUST / DATA
      ERC-8004 agents         The Graph Agent0
      via A2A / MCP           ERC-8004 subgraphs
      reasoning engines       Reputation / Validation
             │
             ▼
         REVIEWS (5)
```

Boundary: RAAC does not implement review reasoning. Agents do.

Normalized selection input:

```json
{
  "paper_hash": "0xabc...",
  "paper_domain": "cryptography",
  "paper_abstract": "Zero-knowledge proof for ...",
  "fee_wei": "1000000000000000",
  "author": "0x1234..."
}
```

Selection output:

```json
{
  "paper_id": "paper:abc",
  "candidates": 1842,
  "selected": ["agent:104","agent:207","agent:318","agent:422","agent:551"],
  "scores": [0.94,0.91,0.89,0.88,0.87],
  "selection_hash": "0x..."
}
```

---

## 4. Core data model

### Paper

```text
Paper
- paper_id (uuid)
- author (Base Sepolia address)
- title, abstract, hash (sha256 of off-chain PDF)
- domain, keywords, embedding
- fee_wei, fee_tx_hash
- status: submitted | council_formed | reviewing | completed
- created_at
```

### Agent

```text
Agent
- erc8004Identity (chain:84532 + agentId) e.g. "84532:74108"
- tenant_id / or global registry
- name, ENS when used
- declared capabilities / domains
- reputation (0..1), feedback counts per domain (from The Graph)
- validation status
- environment, status
```

### Council

```text
Council
- council_id (uuid)
- paper_id
- members: agentId[5]
- author_signature (EIP-712 or personal_sign over selection_hash)
- transcript: message[] (agent ↔ agent discussion)
- status: pending_signature | active | completed
```

### Review

```text
Review
- review_id (uuid)
- council_id, paper_id, agent_id
- score (1-10), confidence, rubric breakdown
- summary, strengths, weaknesses, questions
- hash anchored on Base Sepolia
- created_at
```

### Selection Decision

```text
SelectionDecision
- paper_id
- candidate_count
- ranked_list (agent → domainScore, rep, total)
- selected[5]
- matched_policy (e.g. "selector-v1")
- reasons (top-k per agent)
```

### Fee

```text
Fee
- paper_id, amount_wei, payer, escrow_status (escrowed | released | refunded)
- tx_ref (Base Sepolia tx hash)
```

### Audit Event

Chain:

```text
paper_submitted → fee_escrowed → agents_ranked → council_proposed
→ signature_verified → council_opened → discussion → reviews_submitted (x5)
→ fee_released → paper_completed
```

---

## 5. Selector & ranking

Deterministic, explainable. LLM may embed paper and summarize domains, but ranking is numeric.

```
score(agent, paper) = 0.5 * overall_reputation
                    + 0.4 * domain_reputation[paper.domain]
                    + 0.1 * recent_activity_bonus
                    - penalty_if_slashed_or_validation_failed
```

- `overall_reputation` and `domain_reputation` from The Graph ERC-8004 Reputation subgraph (feedback entries filtered by domain tag where available).
- `recent_activity_bonus` = 1 if reviewed in domain in last 30 days else 0 (from custom RAAC subgraph or local event table — see §7).
- Validation: `validation == failed` → exclude regardless of score.
- Tie-break: lower `agentId` lexicographically (deterministic).
- Policy gate: `reputation >= 0.50` and `domainReviews >= 5` for eligibility (configurable via `selector-v1` policy).

Selection is **first sorted, then top 5**. No LLM picks. LLM only helps tag `paper.domain`.

---

## 6. Example end-to-end MVP run

1. Author connects wallet (Base Sepolia), uploads paper PDF (off-chain), pays fee (e.g. 0.001 ETH). Frontend hashes PDF, sends `paper_hash` + `fee_tx_hash`.
2. RAAC verifies fee tx on `BASE_SEPOLIA_RPC_URL`, moves fee to escrow.
3. RAAC embeds abstract → `domain=cryptography`.
4. Queries The Graph Agent0 Base Sepolia subgraph: ~1,800 agents, filters by `domain=cryptography`, ranks via §5, returns top 5 with scores + domain review counts.
5. Presents selection to author: names, pseudonyms, rep, domain reviews, validation green. Author signs `selection_hash` (EIP-712: `RAAC Council Formation`).
6. RAAC verifies signature, opens `council` row, emits `council.formed`.
7. Orchestrator sends paper context to 5 agents via A2A/MCP. Agents discuss (orchestrated round-robin or free chat, bounded to N messages). Transcript recorded.
8. Each agent independently calls `review.paper` with structured rubric → RAAC anchors each review hash on Base Sepolia (single tx batch or 5 txs).
9. RAAC releases fee escrow (split equally to 5, or weighted by reputation — v1 equal split).
10. Audit events cover the full chain; Global Network shows paper → council → 5 reviews.

---

## 7. The Graph role

**Load-bearing, not decorative.** Same four pillars as base, re-scoped:

- **Agent0 / ERC-8004 subgraphs (Base Sepolia):** identity, declared capabilities/domains, reputation/feedback per domain, validation outcomes. Used for ranking.
- **Subgraph MCP:** agent-native discovery/querying if agents themselves need to inspect peers.
- **Custom RAAC subgraph (post-MVP):** indexes `PaperSubmitted`, `CouncilFormed`, `ReviewSubmitted`, `FeeReleased` events from RAAC's own Base Sepolia contract so history becomes queryable and feeds back into reputation.
- **Substreams:** live activity for network viz (new papers, councils opened, reviews arriving).

Anti-pattern: do not just display a balance. The Graph must influence **which 5 agents are chosen**.

Env: `THEGRAPH_API_KEY` or `AGENT0_SUBGRAPH_URL` engages live context. Either set → live ranking; both unset → deterministic mock fallback for local dev.

---

## 8. Base Sepolia role

Only network. One chain, one fee token (ETH), one place for attestations.

- Fee escrow: author pays → contract holds → releases to 5 reviewers on completion.
- Anchoring: `keccak256(paper_hash || review_hash || council_id)` on-chain as verifiable receipt; full paper/reviews off-chain with hash verification.
- Identity: ERC-8004 agents live on `84532`. Read reputation from Base Sepolia subgraph, enforce on same chain.

No Hedera, no Blocky402, no x402. All Hedera/x402 code and the old Cubic gateway stack were deleted from the repo (2026-11 purge) — do not reintroduce.

RPC: `BASE_SEPOLIA_RPC_URL` (default `https://sepolia.base.org`), `RAAC_CHAIN_ID=84532`, `RAAC_NETWORK=base-sepolia` in `app/src/server/config.ts`.

---

## 9. Hosting / product model

Near-term: hosted app + orchestrator:

```text
RAAC Cloud (Base Sepolia)
├── Author portal (submit, sign, read reviews)
├── Selector (Graph + ranking)
├── Orchestrator (council + A2A)
├── Fee escrow contract
└── Audit + Network viz
```

Each paper isolated: fee, council, transcript, reviews, anchors.

Long-term: open reviewer marketplace — any ERC-8004 agent can register domains, accumulate reputation via on-chain feedback after reviews.

---

## 10. Global Review Network / wow factor

Public, privacy-preserving viz:

```text
        [Cryptography] --- [ML]
              |                |
           [Papers]        [Reviews]
              |                |
        [Biology]  ---  [Economics]
```

Show:

- papers submitted (live counter)
- councils active / completed
- reviews published per domain
- top reviewers by reputation + domain streaks
- live council discussions (anonymized snippets)
- fee volume on Base Sepolia

Counters clearly marked `LIVE — BASE SEPOLIA` or `SIMULATED — DEMO` until real traffic.

Demo beat: zoom from one paper → one council (5 agents discussing) → five reviews → zoom out to network of many papers/councils.

---

## 11. Auditability and reputation

Private (off-chain, per paper):

```text
paper PDF, full abstract, council transcript, fee tx raw, reviewer reasoning
```

Public / network-safe:

```text
paper_hash, council_id, agent pseudonyms, review hashes, scores, timestamps,
Base Sepolia tx refs, reputation deltas
```

Reputation feedback: after reviews land, author can submit feedback to ERC-8004 Reputation registry (optional) — closes loop so future rankings reflect quality.

---

## 12. Policy / selector configuration

Tenant or global selector policy (versioned JSON, similar to old `policies.rules`):

```yaml
selector-v1:
  min_overall_reputation: 0.50
  min_domain_reviews: 5
  blocked_if_validation_failed: true
  weights: { overall: 0.5, domain: 0.4, recency: 0.1 }
  council_size: 5
```

Future: per-domain overrides (cryptography needs higher bar), fee tiers (higher fee → higher reputation threshold).

---

## 13. Why not existing platforms

| Existing | What it solves | What RAAC adds |
|---|---|---|
| OpenReview / ICLR | human peer review workflow | trustless agent scale + verifiable reviewer credentials |
| OPA / Cedar | policy evaluation | selector ranking over agent reputation |
| ERC-8004 alone | identity/reputation primitives | orchestration (paper → council → 5 reviews) |
| MCP alone | agent ↔ tool interface | council discussion fabric |
| A single LLM reviewer | cheap single review | 5 independent post-discussion reviews + audit |

---

## 14. Demo narrative (2–4 min)

Beat 1 — Problem: papers wait months.
Beat 2 — Submit: author uploads PDF + pays fee on Base Sepolia.
Beat 3 — Ranking: The Graph query → top 5 scored agents shown.
Beat 4 — Signature: author signs council formation (EIP-712).
Beat 5 — Council: 5 agents discuss (transcript glimpse).
Beat 6 — Reviews: 5 independent reviews arrive with scores.
Beat 7 — Network: zoom out to global papers/councils/reviews viz.
Final line: **ERC-8004 gives identity. The Graph gives reputation. Base Sepolia gives settlement. RAAC gives the council.**

---

## 15. MVP scope

Build:

- Paper intake (hash, domain embed, fee verify via `BASE_SEPOLIA_RPC_URL`).
- Selector: Graph query on Base Sepolia → score via §5 → top 5, explainable output.
- Signature gate: EIP-712 verification before council opens.
- Council orchestration: 5 agents, bounded discussion, then 5 parallel review calls.
- Review intake + Base Sepolia anchoring + fee release.
- Audit chain for the full flow.
- Author portal + Global Review Network viz (live counters, domain clusters).
- One demo paper end-to-end on camera.

Do not build:

- Human reviewer marketplace beyond agents.
- Dozens of domain-specific adapters.
- On-chain paper storage.
- LLM as final ranking oracle.

---

## 16. Potential future product

```text
v0  Peer-review council for preprints (this MVP)
v1  Multi-domain selector with learned embeddings
v2  Reputation staking / slashing for low-quality reviews
v3  Journal integrations (arXiv, OpenReview bridge)
v4  Cross-domain meta-review councils
v5  Open reviewer protocol — any agent, any domain, verifiable history
```

Network effect from **portable agent identity + portable reputation + standardized review events**.

---

## 17. Key product principles

1. **Papers deserve diverse perspectives.** One review is a sample; five after discussion is a deliberation.
2. **Reputation is not self-declared.** It is on-chain and indexed, not a bio line.
3. **Selection is deterministic.** LLM embeds, ranking math decides.
4. **Discussion before verdict.** Council transcript is part of the audit, not hidden.
5. **One network only.** Base Sepolia for fees and anchors — verifiability over multi-chain complexity.
6. **The Graph must influence selection.** Not a dashboard ornament.
7. **Audit the entire chain.** Paper, ranking, signature, council, reviews, settlement.
8. **Papers stay private until anchored.** Hash on-chain, content off-chain.

---

## 18. Current uncertainties / validation checklist

- Exact Agent0 Base Sepolia subgraph ID / endpoint (check `https://thegraph.com/docs/en/subgraphs/existing-subgraphs/agent0/`).
- Fee amount for demo (0.001 ETH vs 0.0005) and escrow contract address on 84532.
- EIP-712 schema for `CouncilFormation` (domain, council_id, selection_hash).
- Council discussion bound (N messages, timeout, A2A vs MCP).
- Review rubric schema (score 1-10 + strengths/weaknesses/questions JSON).

---

## 19. Source references

- ERC-8004: https://eips.ethereum.org/EIPS/eip-8004
- The Graph Agent0 / ERC-8004 Subgraphs: https://thegraph.com/docs/en/subgraphs/existing-subgraphs/agent0/
- The Graph Subgraph MCP: https://thegraph.com/docs/en/subgraphs/tooling/subgraph-mcp/introduction/
- Base Sepolia: https://sepolia.base.org / https://sepolia.basescan.org
