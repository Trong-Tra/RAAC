"use client";

// FAQ accordion — answers drafted from PROJECT.md (§2 boundaries, §3
// architecture, §5 intent handling, §7/8/15 partners, §13 competitors).
// Copy is UI-owned; expect product edits before launch.
import { useState } from "react";

const QA: { q: string; a: string[] }[] = [
  {
    q: "What is RAAC?",
    a: [
      "RAAC is the implementation of Verifiable AI Reviewers — a decentralized multi-agent qualification framework for peer review on Base Sepolia. It extends ERC‑8004 with a hybrid identity (ERC‑5192 soulbound reputation badge + ERC‑721 endpoint NFT), deterministic hierarchical skill matching, and a VRF-selected review council — built for on-chain efficiency and immutable trust.",
    ],
  },
  {
    q: "How does skill matching work without LLM embeddings?",
    a: [
      "Agents declare Sa={(qj,ℓ)} with ℓ∈{NOVICE,PROFICIENT,EXPERT} over a disclosed taxonomy T=(V,E), |V|=247 (ACM CCS + arXiv). For a paper’s Sp={(si,wi)}, relevance w(si,qj) uses exact/parent/child/sibling/graph-distance decays (βp,βc,βs,βg) and proficiency λ(ℓ): M(a,p)=Σ wi·max w(si,qj)λ(ℓ). Cost O(|A|·|Sp|·|Sa|), ~42 ms/paper — F1 0.812 vs SPECTER2 0.773 and Jaccard 0.666 on 100 arXiv papers.",
    ],
  },
  {
    q: "How does hybrid identity stop reputation laundering?",
    a: [
      "On registration the Identity Registry mints ⟨SBTrep, NFTendpoint⟩. The ERC‑5192 SBTrep is locked to the operator wallet and accumulates R(a)=wr·r̂+wα·α+wh·h+wc·c; the ERC‑721 NFTendpoint holds the service URI. Transferring the endpoint migrates routing only — credibility stays with the original operator. Skill claims ℓ(qj) are staked via validationRequest/validationResponse and slashed by TEE or human challenge if inflated.",
    ],
  },
  {
    q: "How does reputation recover after a failure?",
    a: [
      "Updates use EMA Rt+1=(1−η)Rt+ηR(Δt) with ηrecovery < ηnormal after slashing. A Premium agent (≈85) slashed to Entry (≈45) needs ~100–150 sustained honest reviews to return to Standard. Gini converges to ~0.38 — meritocratic without monopoly. Proposition 1 bounds drift tracking as O(√η + K/ηT).",
    ],
  },
  {
    q: "How is the council formed and why VRF?",
    a: [
      "Qualified agents are ranked Γ(a,p)=γm·M(a,p)+γr·R(a)/100, top-2N go to Chainlink VRF which picks final N. A diversity constraint (≥⌈N/2⌉+1 distinct model families) enforces the Boland dependent-jurors bound PN,ρ,c¯. If ρ<0.5, enlarging the council amplifies errors — system falls back to human review.",
    ],
  },
  {
    q: "What about Sybil, collusion, and prompt injection?",
    a: [
      "VRF makes Sybil 4.1% seat share → 0.035 decision-flip, collusion k=3 → 0.07 (k=4 → 0.162). Layered defense (PDF-text filtering + guard + majority) drops prompt-injection from 78.0% (raw LLM) to 4.0% (2/50).",
    ],
  },
  {
    q: "What does it cost on-chain?",
    a: [
      "Base Sepolia: mintHybridIdentity ~182K gas (±6.6K), validationResponse ~103K, validationRequest ~88K, giveFeedback ~73K. Off-chain qualifier ~42 ms/paper. No new Solidity beyond the ERC‑8004-compatible registries; contracts were benchmarked on Base Sepolia.",
    ],
  },
  {
    q: "Where do The Graph and Base Sepolia fit?",
    a: [
      "Off-chain engine does NLP ingestion, skill extraction, and LLM review generation; the on-chain EVM trust layer anchors identity, reputation, validation, and CID storage governance (IPFS/Arweave). The Graph Agent0/ERC‑8004 subgraphs are the live source for R(a) and validation — not decoration.",
    ],
  },
  {
    q: "What data is on-chain vs off-chain?",
    a: [
      "On-chain: hybrid identities, staked skill validations, reputation R(a), review hashes/CIDs, and governance. Off-chain: manuscript ingestion, Sp extraction, M(a,p) ranking, and council LLM inference. Paper PDFs stay on arXiv; DB only stores URL + hash + abstract for the demo.",
    ],
  },
  {
    q: "What are the on-chain addresses?",
    a: [
      "Base Sepolia 84532 — verify on sepolia.basescan.org and thegraph.com:",
      "Identity Registry (Hybrid SBTrep ERC‑5192 + NFTendpoint ERC‑721): 0x8004a818bfb912233c491871b3d84c89a494bd9e",
      "Reputation Registry: 0x8004b663056a597dffe9eccc1965a193b7388713",
      "Demo agents: 84532:9223, 84532:9224, 84532:9225, 8453:74108",
      "Agent0 subgraph: 4yYAvQLFjBhBtdRCY7eUWo181VNoTSLLFd5M7FXQAi6u",
      "Deployer: 0x7EA634e331CF7b503df2e224f77a7C589462F1F2",
    ],
  },
  {
    q: "How do I try it?",
    a: [
      "Connect a wallet (Base Sepolia 84532) → /console → paste an arXiv link. RAAC digests it, ranks demo agents by M(a,p) + R(a), you sign the council (EIP-712), then watch the council discuss and stream independent peer reviews. This demo is a simulator + Solidity on Base Sepolia — code at github.com/Hpgbao2204/MAPR.",
    ],
  },
];

export default function FaqList() {
  const [open, setOpen] = useState(0);
  return (
    <div style={{ marginTop: "5vh", display: "grid" }}>
      {QA.map((item, i) => {
        const on = i === open;
        return (
          <div
            key={item.q}
            style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}
          >
            <button
              onClick={() => setOpen(on ? -1 : i)}
              aria-expanded={on}
              className="mono"
              style={{
                width: "100%",
                cursor: "pointer",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "baseline",
                gap: 20,
                padding: "22px 0",
                background: "transparent",
                border: "none",
                textAlign: "left",
                color: on ? "#f4f4f4" : "#c9c9c9",
                fontFamily: "inherit",
              }}
            >
              <span style={{ fontSize: 16, fontWeight: 700, letterSpacing: "-0.01em", fontFamily: "var(--font-sans, inherit)" }}>
                {item.q}
              </span>
              <span
                aria-hidden
                style={{
                  fontSize: 13,
                  color: "#5a5a5a",
                  border: "1px solid #2e2e2e",
                  width: 26,
                  height: 26,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  background: on ? "#e8e8e8" : "transparent",
                }}
              >
                <span style={{ color: on ? "#000" : "#8a8a8a" }}>
                  {on ? "–" : "+"}
                </span>
              </span>
            </button>
            {on && (
              <div className="ring-readout" style={{ padding: "0 0 26px", maxWidth: 720 }}>
                {item.a.map((p) => (
                  <p
                    key={p.slice(0, 24)}
                    style={{ fontSize: 15, lineHeight: 1.7, color: "#8a8a8a" }}
                  >
                    {p}
                  </p>
                ))}
              </div>
            )}
          </div>
        );
      })}
      <div style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }} />
    </div>
  );
}
