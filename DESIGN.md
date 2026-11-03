# DESIGN.md

## Purpose

This document is the canonical project-wide design language and system-design reference. Any agent making UI, UX, product-surface, naming, or interaction-design changes MUST read this file before editing.

## The World

**RAAC is set as a nineteenth-century lexicon page.** The product is "The Review Lexicon, Vol. 84532" — a printed reference volume where each submitted paper is an *entry*, the reviewer network is *routed* like a cross-reference, the council is a *sitting* of five *examiners*, and reviews are *reports* committed to the chain like plates in the volume.

Chosen via the impeccable process: catalog world `rw-lexicon-shoulder-and-plate`, seed `seed:709395222734454b`, concept-seed key `98adb0e8f02ede8afd1cff391edfd748`, recorded as `--kind challenger --chosen lexicon-shoulder-and-plate`. Direction contract and quality-bar refs live in `app/.impeccable/surfaces/app.md` and `app/.impeccable/refs/`.

This world replaced the earlier monochrome/industrial direction because the product targets the Eureka **education/science** track: bright, scholarly, warm, and legible in a demo video.

## Design Principles

- **Make the mechanism legible.** The user should always see which of the five journey steps (submitted → ranked → signed → council → anchored) a paper is on, and what the one live action is.
- **One live action per state.** Each entry page state exposes exactly one primary vermilion action ("Submit arXiv →", "Sign the council →", "Convene the council →", "Anchor the reports →", "Read the five reports →"). No competing CTAs.
- **The page is the metaphor.** Shoulder index (thumb tabs) on the left carries the journey; plates (ruled, captioned frames) carry artifacts; margin plates carry anchoring and the index of entries.
- **Ink means identity.** The five examiners each own a mineral ink (ultramarine, emerald, madder, sepia, violet) that follows their name, mark-scale, and verdict everywhere they appear.
- **Bright stock, engraving ink.** Cream paper ground, near-black ink, hairline rules. Vermilion is reserved for the live action and the "you are here" mark — never decoration.
- Keep terminology consistent across UI, APIs, docs, and code: entry, council, sitting, examiner, report, routing, anchoring, volume. Do not invent synonyms without updating PROJECT.md and MEMORY.md.

## Color Tokens

Defined in `app/src/app/globals.css` `:root`. Grounds and inks:

| Token | Value | Use |
|---|---|---|
| `--paper` | `#f4efe4` | Page ground (uncoated cream stock) |
| `--paper-raised` | `#faf7ee` | Raised surfaces, selection text on vermilion |
| `--paper-sunk` | `#ece5d3` | Sunk/selected rows, scrollbar track |
| `--ink` | `#1a1712` | Primary text, strong rules |
| `--ink-soft` | `#4a4438` | Secondary text |
| `--ink-faint` | `#6f6757` | Captions, metadata (≥4.5:1 on cream — do not lighten) |
| `--vermilion` | `#b7341f` | The live action, "here" marks, focus rings, links hover |
| `--vermilion-deep` | `#8f2b1f` | Link text, small-caps inline actions |
| `--chrome` | `#8a680b` | Queued/pending states (darkened yellow — do not lighten) |
| `--ultramarine` `#28418f` · `--emerald` `#1f6e4a` · `--madder` `#a63d55` · `--sepia` `#6b4a2f` · `--violet` `#6a4a8f` | The five examiner inks, in rank order i–v |
| `--rule` / `--rule-soft` / `--rule-faint` | ink at 0.9 / 0.28 / 0.14 alpha | Hairline rules, plate frames, row separators |

Never introduce new accent colors; if a state needs distinction, reach for an existing ink or a rule weight first.

## Typography

Loaded via `next/font` in `app/src/app/layout.tsx` as `--font-serif` and `--font-mono`:

- **Source Serif 4** (`--serif`) — everything by default: display headings, body, buttons, navigation. Small-caps (`font-variant: small-caps`, via `.sc`) is the default voice for labels, buttons, plate captions, and eyebrows.
- **Courier Prime** (`--mono`, via `.mono`) — **reserved** for registry codes (`84532:9223`), hashes, scores, and measurements. Do not set buttons or prose in mono; that is a contract violation the reviewer checks.

Buttons (`.btn-action`, `.btn-outline`) are serif small-caps 700 — vermilion fill for the live action, ink outline for secondary.

## Layout & Components

- **Measure**: content rides `.page-measure` with `.section-pad`; the `.guide-line` (volume · entry · network) tops every page.
- **Journey grid** (`.journey-grid`, desktop: shoulder | entry | margin): the `/app` page layout. ≤640px it collapses to one column; the shoulder becomes a horizontal wrapped row; the header wraps and puts nav on a second full-width row.
- **Shoulder** (`.shoulder`, `.shoulder-step`, `.shoulder-thumb`): the five journey steps as thumb tabs; `here` = vermilion thumb + vermilion label, `done` = filled ink thumb.
- **Plate** (`app/src/components/Plate.tsx`): the artifact frame — double-rule border, small-caps caption left, plate number right (e.g. "Plate ii. — The five examiners" / "median 7/10"). Reuse it; do not invent new card chrome.
- **Mark scale**: ten ticks filled by reputation score, drawn in the owner's ink — used in routing rows (`/app`).
- **Chips** (`.chip`): mono registry codes, outlined.
- **Lexicon definition paragraphs**: `<b class="sc">selection, n.</b>` + running italic-free prose — the recurring explanatory pattern.
- Motion is minimal and print-like: `flap-in` (small rise) for arriving reports, `blink`/`think-dot`/`ring-in` for live session indicators only.

## Information Architecture

- `/` — landing: hero ("Peer review, set in type.") beside **Plate 0 — a sitting, abridged** (animated five-ink specimen, `SittingSpecimen.tsx`); "Why this volume exists" (overload / distrust / opacity + sourced evidence plate with count-up numerals); three acronym definitions; live volume stats plate; **The compilers** (team portraits in plate frames, monogram fallback until `public/team/<name>.jpg` lands); colophon CTA.
- Motion: `motion` (motion.dev) powers `Reveal` (scroll-in rise) and `CountUp` (numerals). All motion respects `prefers-reduced-motion`. Keep animation print-like: rise, flap, count — no parallax, no 3D, no physics toys.
- `/app` — **the product**: submission plate when empty; otherwise the entry (title, provenance line, the one live action), Routing (ranked agents with mark scales), Council plate (five examiners, reports, median), Marginalia (discussion), margin plates (Anchoring, Index of entries). `?paper=<id>` selects an entry.
- `/papers` → redirects to `/app`. `/papers/[id]` — the reading page: full reports in examiner inks.
- `/network` — the global view: registered agents, selection fabric, live events. Light lexicon theme; aggregated/anonymized only — never private paper content.
- `/console` — author operations (papers, audit, settings); overview redirects to `/app` preserving `?paper=`. Wallet-gated sub-pages show a locked plate when disconnected.
- `/faq` — must describe the real shipped mechanism only (see below).

## Truth Rules (binding)

- The FAQ and all copy must match the shipped mechanism: deterministic score `0.5·overall + 0.4·domain + 0.1·recency` over The Graph reputation/domain/recency; top five admitted; author signs an EIP-712 `CouncilFormation` (paper hash + selection hash + author); examiners discuss then write independently; sha256 review hashes anchored on Base Sepolia 84532. **No VRF, no ERC-5192/721, no Hedera, no x402** — those belonged to retired iterations and must never reappear in product copy.
- Reviews are paired to examiners **by identity** (`agents.id → agentKey` map + `reviewFor(agentKey)`), never by array index; review queries order by `asc(reviews.createdAt)`.
- Demo agent codes are `84532:9223–9227`.
- Do not editorialize about MVP trust assumptions in the UI — the surface presents the network as registered ERC-8004 examiners, full stop.

## Alignment Rule

When a proposed implementation conflicts with this document, stop and reconcile the design before proceeding. Update this document only when the project intentionally changes its canonical design language, and keep `app/.impeccable/design.json` in sync when it does.
