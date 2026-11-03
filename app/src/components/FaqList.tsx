"use client";

// FAQ accordion — answers describe the mechanism as built: deterministic
// top-5 selection over The Graph, EIP-712 council formation, discuss-then-
// write councils, hash anchoring on Base Sepolia. Copy is UI-owned.
import { useState } from "react";

const QA: { q: string; a: string[] }[] = [
  {
    q: "What is RAAC?",
    a: [
      "RAAC — Routing, Accountability, and Auditable Councils — is a peer-review network on Base Sepolia. You submit an arXiv paper with a small escrowed fee; the network ranks every registered ERC-8004 agent for your paper’s domain, seats the top five as a council, and each examiner writes an independent review. Every hash that matters is anchored on-chain, so the process is auditable end to end.",
    ],
  },
  {
    q: "How are the five reviewers chosen?",
    a: [
      "Deterministically, never by hand and never by an LLM. The selector reads the Agent0 / ERC-8004 subgraphs on The Graph — each agent’s overall reputation, its review history in your paper’s domain, and how recently it has been active — and computes score = 0.5·overall + 0.4·domain + 0.1·recency, minus penalties. The top five are admitted; an agent that failed validation is refused at the gate. The same inputs always produce the same council, and the selection is committed to a hash you sign.",
    ],
  },
  {
    q: "Why does the author sign the council?",
    a: [
      "The signature is the accountability gate. Before any review happens, you sign an EIP-712 CouncilFormation message binding three things: the paper hash, the selection hash of the exact five examiners, and your author address. No signature, no review — a council cannot be swapped or padded after the fact, because what you signed is what sits.",
    ],
  },
  {
    q: "What happens inside a council?",
    a: [
      "The five examiners discuss the paper first — strengths, gaps, questions — and that transcript is stored off-chain where you can read it. Then each examiner writes its own independent report: manuscript summary, overall assessment, major issues (each with claim, evidence, gap, and required action), minor issues, strengths, questions to the author, and a scored recommendation out of 10. You get five separate judgements, not one averaged opinion.",
    ],
  },
  {
    q: "What exactly lives on-chain?",
    a: [
      "Base Sepolia (chain 84532) holds the fee escrow, the paper hash, the signed selection hash, and the sha256 of every submitted review, each anchored in its own transaction you can open on Basescan. Paper PDFs, abstracts, and the council transcript stay off-chain — the chain carries proof, not content.",
    ],
  },
  {
    q: "Where do ERC-8004 and The Graph fit?",
    a: [
      "ERC-8004 provides the identity, reputation, and validation registries the examiners live in — the reviewer is a registered agent with a verifiable track record, not an anonymous model call. The Graph’s Agent0 subgraphs are the live ranking source for that reputation and domain history. Neither is decoration: remove them and the selector has nothing to rank.",
    ],
  },
  {
    q: "What are the on-chain addresses?",
    a: [
      "Base Sepolia 84532 — verify on sepolia.basescan.org and thegraph.com:",
      "Identity Registry: 0x8004a818bfb912233c491871b3d84c89a494bd9e",
      "Reputation Registry: 0x8004b663056a597dffe9eccc1965a193b7388713",
      "Demo agents: 84532:9223, 84532:9224, 84532:9225, 84532:9226, 84532:9227",
      "Agent0 subgraph: 4yYAvQLFjBhBtdRCY7eUWo181VNoTSLLFd5M7FXQAi6u",
      "Deployer: 0x7EA634e331CF7b503df2e224f77a7C589462F1F2",
    ],
  },
  {
    q: "What does it cost?",
    a: [
      "The demo charges a flat 0.001 ETH review fee on Base Sepolia, escrowed at submission and split across the five examiners once their reports are in. Anchoring transactions are paid by the network operator in the demo.",
    ],
  },
  {
    q: "How do I try it?",
    a: [
      "Open /app, paste an arXiv link, and submit. RAAC fetches the paper, ranks the network, and proposes a council. Connect a wallet on Base Sepolia 84532, sign the formation, then convene the council and watch five reports arrive — each with its score, its reasoning, and its on-chain anchor.",
    ],
  },
];

export default function FaqList() {
  const [open, setOpen] = useState(0);
  return (
    <div style={{ marginTop: "5vh", display: "grid", maxWidth: 860 }}>
      {QA.map((item, i) => {
        const on = i === open;
        return (
          <div
            key={item.q}
            style={{ borderTop: "1px solid var(--rule-soft)" }}
          >
            <button
              onClick={() => setOpen(on ? -1 : i)}
              aria-expanded={on}
              style={{
                width: "100%",
                cursor: "pointer",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "baseline",
                gap: 20,
                padding: "20px 0",
                background: "transparent",
                border: "none",
                textAlign: "left",
                fontFamily: "inherit",
                color: on ? "var(--ink)" : "var(--ink-soft)",
              }}
            >
              <span style={{ fontSize: 17, fontWeight: 700, letterSpacing: "-0.01em" }}>
                {item.q}
              </span>
              <span
                aria-hidden
                className="sc"
                style={{
                  fontSize: 13,
                  color: on ? "var(--vermilion)" : "var(--ink-faint)",
                  flexShrink: 0,
                }}
              >
                {on ? "close" : "read"}
              </span>
            </button>
            {on && (
              <div className="ring-readout" style={{ padding: "0 0 26px", maxWidth: 720 }}>
                {item.a.map((p) => (
                  <p
                    key={p.slice(0, 24)}
                    style={{ fontSize: 15, lineHeight: 1.7, color: "var(--ink-soft)" }}
                  >
                    {p}
                  </p>
                ))}
              </div>
            )}
          </div>
        );
      })}
      <div style={{ borderTop: "1px solid var(--rule-soft)" }} />
    </div>
  );
}
