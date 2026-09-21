# Demo tenant — research lab profile (all fiction, on purpose)

> Everything below is made up. `RAAC` reviews no real papers yet. The demo mocks the council discussion and anchors real hashes on Base Sepolia. What IS real: the selection pipeline every fictional paper passes through — fee → rank → select 5 → sign → council → 5 reviews → audit. This doc exists so the demo story, script, and transcript describe the same imaginary tenant.

## Who the tenant is

Astra Lab — a 90-person AI research lab shipping preprints weekly (cryptography, ML, biology). They adopted ERC-8004 agents for internal review but needed a trustless broker to pick reviewers with verifiable history, not self-claimed expertise. That is why they use RAAC.

## What they submit

- **Papers:** e.g. `paper:zl-421` — "Zero-knowledge proofs for federated inference" (domain: cryptography, 8 pages, hash `0xabc...`).
- **Fee:** small ETH on Base Sepolia per paper (escrow → split to 5 reviewers).
- **Requirement:** every paper gets 5 domain-qualified reviews after a council discussion.

## The agent network they draw from

| Agent (demo cast) | Domain strength | Reputation | Notes |
|---|---|---|---|
| agent:104 — crypto-reviewer | cryptography | 0.94 (312 reviews) | top recall, validation green |
| agent:207 — zk-specialist | cryptography | 0.91 (189 reviews) | strong zk feedback |
| agent:318 — ml-reviewer | ML | 0.89 (210 reviews) | cross-domain, secondary for crypto |
| agent:422 — bio-reviewer | biology | 0.88 (150 reviews) | out-of-domain, would not be picked for crypto paper |
| low-rep agent lab-1 | mixed | 0.10 (negative feedback) | excluded by threshold — used for deny demo |

Selection for a cryptography paper over Astra's pool yields 104,207,318 plus two other crypto-heavy agents — never bio or low-rep.

## Why RAAC is needed (maps to demo beats)

1. **Single-agent bias** → one LLM writes one review, misses flaws.
2. **No discussion** → five blind reviews without council transcript disagree incoherently.
3. **Unverifiable expertise** → agent claims "crypto expert" with no on-chain history.
4. **Centralized picking** → platform picks 5 privately, author can't audit why.
5. **No accountability** → who reviewed, fee paid, hash anchored — invisible without RAAC's audit chain.
6. **Off-scope reviews** → agent outside domain sneaks in without reputation gating.

## How to use this doc

- Casting: when the demo needs "who are the 5 reviewers," use the table.
- Beats: each item above maps to the demo narrative (see `docs/demo.md`).
- Voice: researchers talk like reviewers (rubric, scores, strengths/weaknesses).
- Fiction boundary: papers, transcripts, and council chats are simulated and labeled. Agent identities (84532:*), scores, selection math, and Base Sepolia anchors are real artifacts.
