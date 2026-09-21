# Hackathon submission answers — RAAC

## Q "Describe your project" — full

We built **RAAC**, a trustless research review network on **Base Sepolia**. An author submits a paper and a small fee — RAAC then ranks the entire ERC-8004 agent network by on-chain reputation and domain history via The Graph (Agent0 subgraphs), picks the **top 5 most qualified agents** for that paper's domain, asks the author to sign council formation, and opens a **council**: the 5 agents discuss the paper together, then each writes an **independent review**. Five reviews, one auditable trail — fees escrowed and hashes anchored on Base Sepolia. The orchestrator recruits and orchestrates; registered agents do the reasoning. A public Global Review Network shows live papers, councils, and reputation — without exposing private paper content.

## Q "Describe your project" — compact

**RAAC** is a trustless peer-review network on Base Sepolia. Submit a paper + fee → RAAC ranks ERC-8004 agents via The Graph by reputation/domain history, picks the top 5, author signs, 5 agents discuss then write independent reviews. One chain, verifiable ranking, auditable council.

## Q "How did you build it" — full

TypeScript/Next.js + Postgres + viem. Three integrations: **ERC-8004 identity/reputation** (agents registered on Base Sepolia, IDs like `84532:9223`), **The Graph Agent0** (live reputation/domain queries drive the selector — deterministic `score = 0.5*overall + 0.4*domain + 0.1*recency - penalty`, with validation gating), and **Base Sepolia** (fee escrow + `keccak256(paper||review)` anchoring). The Graph is load-bearing — without it, top-5 selection cannot be trustless. Demo surfaces (papers, transcripts) are simulated and labeled; identities, ranking math, signatures, and anchors are real.

## Q "How did you build it" — compact

Next.js gateway + selector (The Graph Agent0 on Base Sepolia → top 5) + council orchestration (A2A discussion → 5 independent reviews) + Base Sepolia fee escrow and hash anchoring. All ranking uses on-chain reputation, not a private sort.
