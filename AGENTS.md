# AGENTS.md

## Mandatory Project Context

Before doing substantive work in this repository, agents **MUST explicitly read all three canonical project context files** in this order:

1. [`PROJECT.md`](PROJECT.md) — canonical product, architecture, hackathon, partner, MVP, and implementation strategy.
2. [`DESIGN.md`](DESIGN.md) — canonical project-wide design language and system/design rules. **This must be read before making any UI, UX, product-surface, interaction, naming, or design-system changes.**
3. [`MEMORY.md`](MEMORY.md) — hot working memory containing current implementation state, active tasks, decisions, constraints, facts, and unresolved nuances. **Agents must actively maintain this file as project state changes.**

Do not make architectural decisions from memory or from scattered conversation context when the above files contain the canonical project direction.

## Documentation Index

| File | Role | Agent requirement |
|------|------|-------------------|
| [`PROJECT.md`](PROJECT.md) | Canonical product / hackathon / architecture specification | MUST read before substantive work |
| [`DESIGN.md`](DESIGN.md) | Canonical design language and system-wide design rules | MUST read before design/UI/UX/product-surface work |
| [`MEMORY.md`](MEMORY.md) | Hot working memory: implementation state, facts, decisions, tasks, nuances | MUST load before substantive work and MUST update when relevant state changes |

## Repository / Monorepo Structure

This repository is a **monorepo with two independently managed applications/packages**:

```text
/
├── app/          # Next.js web application (App Router)
│   ├── package.json
│   └── ...       # app-local tooling/configuration
└── contracts/    # Solidity smart-contract project
    ├── package.json (or ecosystem-equivalent manifest)
    └── ...       # contract-local tooling/configuration
```

### Provisioning Rules

- `app/` is the **Next.js App Router** application. Provision its own `package.json`, dependencies, scripts, linting, formatting, TypeScript, and framework configuration as appropriate.
- `contracts/` is an **independent Solidity smart-contract workspace**. Provision its own package/dependency manifest and contract-specific build, test, lint, formatting, and deployment tooling.
- Treat `app/` and `contracts/` as separate technical packages with **independent dependency graphs and local tooling configuration**, while they share the same Git repository and product architecture.
- Prefer package-local configs when a tool's behavior differs between the two workspaces. Root-level shared configs are acceptable when they genuinely apply cleanly to both.
- Environment files may be **root-level or package-local** where the tooling supports that natively, but secrets must remain tenant/environment scoped and must never be committed.
- `.gitignore` rules may be root-level and/or nested. Avoid duplicating rules unnecessarily.
- Do not introduce a third application/package at the repository root unless the architecture explicitly calls for it.
- When provisioning or modifying the stack, preserve the boundary: **web/application concerns belong in `app/`; on-chain protocol concerns belong in `contracts/`**.
- Cross-package integration should use explicit interfaces/contracts rather than reaching into the other package's internal implementation.

### Agent Provisioning Expectation

When asked to **provision the tech stack**, the agent should establish the baseline repository structure above first, then install/configure the appropriate tooling inside each package. Do not collapse both workspaces into one root package merely for convenience.

## Product Boundary

This project is **RAAC — a trustless research review network on Base Sepolia (84532)**. An author submits a paper + fee, the system ranks the ERC-8004 agent network by domain knowledge/history/reputation via The Graph (Agent0/ERC-8004 subgraphs), selects the **top 5 compatible agents**, asks the author to sign council formation, then opens a council where the 5 discuss and each writes an independent review. The orchestrator is the broker/recruiter; registered agents do the reasoning. The Graph provides reputation/domain context as the ranking source; ERC-8004 provides identity/reputation/validation primitives; Base Sepolia provides fee escrow and hash anchoring (single network, no Hedera). Ledger/Hedera/x402 references in older code are deprecated and ignored.

## Architectural Rules

**Do not turn the orchestrator into a reviewer.** RAAC ranks and recruits; registered ERC-8004 agents write the reviews. Do not implement review reasoning inside the broker.

**Do not let an LLM be the final selector.** AI may embed a paper and tag its domain; deterministic scoring over on-chain reputation/domain history/validation decides the top 5.

**Do not treat blockchain as the paper database.** Keep paper PDFs, full abstracts, and council transcripts off-chain; use Base Sepolia selectively for fee escrow, hash anchoring, and reputation.

**Do not reintroduce Hedera/x402.** The only network is Base Sepolia. The Cubic gateway, capability, ledger, payments, and executor code was deleted in the 2026-11 purge — do not resurrect it.

**Keep tenant/paper state isolated.** Papers, fees, signatures, councils, transcripts, and reviews belong to the author/paper.

**Keep the global network view separate from paper control.** The global surface showcases aggregated/anonymized papers/councils/reviews and reputation; it must not expose private paper content.

## Working-Memory Rule

After meaningful implementation work, agents MUST update [`MEMORY.md`](MEMORY.md) with any new architecture decisions, implementation state, active task changes, important discoveries, constraints, or unresolved questions. Treat it as the canonical hot-memory layer for agent-to-agent continuity.

## Design-System Rule

Any work that changes interfaces, interactions, visual language, naming conventions, dashboard structure, network visualization, or other product-surface design MUST begin by reading [`DESIGN.md`](DESIGN.md) and remain aligned with it throughout the change.

