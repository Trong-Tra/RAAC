# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Primary: researchers/authors submitting a paper for review — they submit an arXiv link or manuscript, pay a small fee, sign council formation, and receive five independent reviews. Secondary: hackathon judges (Eureka, education/science track) and demo viewers evaluating the network — they must grasp the whole flow from one screen in a recorded video.

## Product Purpose

RAAC is a trustless peer-review network on Base Sepolia (84532). An author submits a paper + fee; the system ranks ERC-8004 agents by on-chain reputation, domain history, and validation via The Graph; the top 5 form a council; the council discusses; each writes an independent review; review hashes anchor on-chain. Success: an author gets five auditable reviews in minutes, and every step — ranking math, signature, transcript, scores, anchors — is inspectable.

## Positioning

The matching layer for trustless review. RAAC recruits and orchestrates; registered ERC-8004 agents reason and review. Selection is deterministic scoring over Graph-indexed reputation — never an LLM's pick. One network (Base Sepolia) for fee escrow and hash anchoring; paper content stays off-chain.

## Operating Context

Demo-first product: the key ritual is a recorded end-to-end run — submit → ranked selection → EIP-712 signature → council discussion → five 7-section academic reviews → Base Sepolia anchor txs (Basescan links). The paper journey page is the hero surface for this recording. Live data: Agent0/ERC-8004 subgraphs for reputation, OpenRouter free-tier models for review generation, a six-agent owned roster on 84532.

## Capabilities and Constraints

- Paper intake via arXiv URL/ID or manual title/abstract/domain.
- Deterministic selector: 0.5·overall + 0.4·domain + 0.1·recency, validation gate, explainable scores.
- EIP-712 `CouncilFormation` signature gate before any council opens.
- Resumable council orchestration; per-agent reviewer personas; 7-section academic review schema.
- Per-review hash anchoring as 0-value self-txs on Base Sepolia; Basescan verification links.
- Fee escrow is a DB row + tx ref (no contract yet); reviews are generated server-side keyed to agent identities (MVP state, never disclosed on the site).
- Terminology: Paper, Council, Review, Selection, Ranking, Signature, Anchor, Agent, Reputation, Network.

## Brand Commitments

- Name: RAAC — Routing, Accountability, and Auditable Councils.
- Wordmark: "RAAC" with an outlined square as the period.
- Confirmed 2026-11-03: bright palette for the education/science track — light, academic-ink family (paper-white ground, ink text, committed science accent). The previous monochrome black world is replaced.
- IA confirmed 2026-11-04: landing (judges) + /console guided journey (product surface, renamed from /app; old power-user console removed) + /network public showcase.

## Evidence on Hand

- Live ERC-8004 identities 84532:9223–9227 + low-rep 8453:74108 on the Agent0 subgraph.
- Real anchor txs on Base Sepolia from prior runs (verifiable on sepolia.basescan.org).
- ICLR overload data for the market story (see MEMORY.md TAM-SAM-SOM).
- No customer logos, testimonials, or revenue claims — none may be fabricated.

## Product Principles

1. Reputation is on-chain and indexed, not self-declared.
2. Selection is deterministic and explainable; the math is shown, not hidden.
3. Discussion before verdict — the transcript is part of the audit.
4. Papers stay private; hashes go on-chain.
5. One network only: Base Sepolia.
