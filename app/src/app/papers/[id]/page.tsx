"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import MacWindow from "@/components/MacWindow";
import SiteFooter from "@/components/SiteFooter";
import SiteHeader from "@/components/SiteHeader";

type Detail = {
  paper: {
    id: string;
    title: string;
    abstract: string;
    domain: string;
    keywords: string[];
    paperHash: string;
    status: string;
    authorAddress: string;
    feeAmountWei: string | null;
    feeTxHash: string | null;
    createdAt: string;
  };
  council: { id: string; status: string; selectionHash: string } | null;
  selection: Array<{ agent_key: string; name: string; erc8004: string; score: number; domainReviews: number; validation: string; exists: boolean }>;
  reviews: Array<{ id: string; agentId: string; score: number; reviewHash: string; summary: string | null }>;
};

function shortAddr(a: string) {
  return `${a.slice(0, 6)}…${a.slice(-4)}`;
}
function shortHash(h: string) {
  return `${h.slice(0, 10)}…${h.slice(-6)}`;
}

export default function PaperDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const [data, setData] = useState<Detail | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/papers/${id}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => {
        if (!j.ok) throw new Error(j.error?.message ?? "load failed");
        setData(j.data);
      })
      .catch((e) => setErr(e.message));
  }, [id]);

  if (err) {
    return (
      <main style={{ minHeight: "100dvh", background: "#000", display: "flex", flexDirection: "column" }}>
        <SiteHeader active="PAPERS" />
        <div className="section-pad">
          <MacWindow title="PAPER — ERROR">
            <div style={{ padding: "26px 24px 28px", color: "#8a8a8a" }}>{err}</div>
          </MacWindow>
          <Link href="/papers" className="mono link" style={{ marginTop: 18, display: "inline-block", fontSize: 11, letterSpacing: "0.14em" }}>
            ← BACK TO PAPERS
          </Link>
        </div>
        <SiteFooter />
      </main>
    );
  }

  if (!data) {
    return (
      <main style={{ minHeight: "100dvh", background: "#000", display: "flex", flexDirection: "column" }}>
        <SiteHeader active="PAPERS" />
        <div className="section-pad mono" style={{ fontSize: 11, letterSpacing: "0.14em", color: "#3f3f3f" }}>
          LOADING PAPER…
        </div>
        <SiteFooter />
      </main>
    );
  }

  const { paper, council, selection, reviews } = data;

  return (
    <main style={{ minHeight: "100dvh", background: "#000", display: "flex", flexDirection: "column" }}>
      <SiteHeader active="PAPERS" />

      <div className="section-pad" style={{ paddingBottom: 0 }}>
        <Link href="/papers" className="mono link" style={{ fontSize: 11, letterSpacing: "0.14em" }}>
          ← PAPERS
        </Link>
        <h1 style={{ marginTop: 18, fontSize: "clamp(28px, 3.5vw, 42px)", fontWeight: 700, letterSpacing: "-0.02em", lineHeight: 1.2, color: "#f4f4f4", maxWidth: 860 }}>
          {paper.title}
        </h1>
        <p style={{ marginTop: 14, fontSize: 14, lineHeight: 1.65, color: "#8a8a8a", maxWidth: 760 }}>{paper.abstract}</p>

        <div className="mono" style={{ marginTop: 18, display: "flex", gap: 10, flexWrap: "wrap", fontSize: 9.5, letterSpacing: "0.12em" }}>
          <span style={{ border: "1px solid #2a2a2a", padding: "4px 8px", color: "#c9c9c9" }}>{paper.domain.toUpperCase()}</span>
          <span style={{ border: "1px solid #2a2a2a", padding: "4px 8px", color: "#c9c9c9" }}>{paper.status.toUpperCase()}</span>
          <span style={{ border: "1px solid #2a2a2a", padding: "4px 8px", color: "#5a5a5a" }}>{shortHash(paper.paperHash)}</span>
          <span style={{ border: "1px solid #2a2a2a", padding: "4px 8px", color: "#5a5a5a" }}>{shortAddr(paper.authorAddress)}</span>
        </div>

        <div className="mono" style={{ marginTop: 12, fontSize: 9.5, letterSpacing: "0.12em", color: "#5a5a5a" }}>
          KEYWORDS: {paper.keywords.join(" · ").toUpperCase()} · FEE: {paper.feeAmountWei ? `${Number(BigInt(paper.feeAmountWei)) / 1e18} ETH` : "—"}
        </div>
      </div>

      <div className="section-pad" style={{ display: "grid", gap: 18 }}>
        {/* Selection — Routing */}
        <MacWindow title="01 — ROUTING — TOP 5 SELECTED (MOCK, PHASE 3 → LIVE GRAPH)">
          <div style={{ padding: "22px 24px 24px" }}>
            <p style={{ fontSize: 13, lineHeight: 1.6, color: "#8a8a8a" }}>
              Ranked via The Graph Agent0 on Base Sepolia: <span className="mono" style={{ color: "#c9c9c9" }}>score = 0.5·overall + 0.4·domain + 0.1·recency − penalty</span>. Mock scores for shell; live selector (Phase 3) will replace this.
            </p>
            <div style={{ marginTop: 18, display: "grid", gap: 10 }}>
              {selection.map((s, i) => (
                <div key={s.erc8004} style={{ display: "flex", alignItems: "center", gap: 14, padding: "12px 14px", border: "1px solid rgba(255,255,255,0.07)", background: i === 3 ? "rgba(255,60,60,0.06)" : "transparent" }}>
                  <span className="mono" style={{ fontSize: 12, color: "#5a5a5a", width: 18 }}>{String(i + 1).padStart(2, "0")}</span>
                  <span aria-hidden style={{ width: 22, height: 22, border: "1px solid #3a3a3a", position: "relative", flexShrink: 0 }}>
                    <span style={{ position: "absolute", inset: 6, background: s.score >= 0.85 ? "#e8e8e8" : s.score >= 0.5 ? "#8a8a8a" : "#4a2a2a" }} />
                  </span>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div className="mono" style={{ fontSize: 12, color: s.validation === "failed" ? "#ff6b6b" : "#e8e8e8", letterSpacing: "0.04em" }}>
                      {s.name} · {s.erc8004} {s.validation === "failed" ? "· FAILED VALIDATION" : ""}
                    </div>
                    <div className="mono" style={{ marginTop: 4, fontSize: 10, letterSpacing: "0.1em", color: "#5a5a5a" }}>
                      SCORE {s.score.toFixed(2)} · {s.domainReviews} DOMAIN REVIEWS · {s.exists ? "IN DEMO TENANT" : "EXTERNAL"}
                    </div>
                  </div>
                  <span className="mono" style={{ fontSize: 11, color: s.score >= 0.5 ? "#c9c9c9" : "#ff6b6b" }}>
                    {s.score.toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
            <div className="mono" style={{ marginTop: 14, fontSize: 10, letterSpacing: "0.12em", color: "#3f3f3f" }}>
              SELECTION HASH: {council ? shortHash(council.selectionHash) : shortHash(paper.paperHash)} · COUNCIL: {council ? council.status.toUpperCase() : "NOT YET FORMED — AWAITING SIGNATURE"}
            </div>
          </div>
        </MacWindow>

        {/* Accountability — Signature */}
        <MacWindow title="02 — ACCOUNTABILITY — AUTHOR SIGNATURE (EIP-712)">
          <div style={{ padding: "22px 24px 24px" }}>
            {council && council.status !== "proposed" ? (
              <p style={{ fontSize: 13, lineHeight: 1.6, color: "#8a8a8a" }}>
                Council <span className="mono" style={{ color: "#e8e8e8" }}>{shortHash(council.id)}</span> formed — author signed <span className="mono" style={{ color: "#c9c9c9" }}>{shortHash(council.selectionHash)}</span>. No signature, no review.
              </p>
            ) : (
              <>
                <p style={{ fontSize: 13, lineHeight: 1.6, color: "#8a8a8a" }}>
                  Author must sign <span className="mono" style={{ color: "#c9c9c9" }}>RAAC CouncilFormation(selection_hash, paper_hash)</span> via EIP-712. This gate is the only way the council opens — Phase 4 will wire `viem verifyTypedData`.
                </p>
                <button className="mono btn-outline" style={{ marginTop: 16, padding: "10px 18px", fontSize: 11, letterSpacing: "0.14em", cursor: "pointer", background: "transparent" }}>
                  SIGN COUNCIL (MOCK — PHASE 4)
                </button>
              </>
            )}
          </div>
        </MacWindow>

        {/* Auditable Councils — Transcript + Reviews */}
        <MacWindow title="03 — AUDITABLE COUNCILS — DISCUSSION → 5 INDEPENDENT REVIEWS (MOCK)">
          <div style={{ padding: "22px 24px 24px" }}>
            <p style={{ fontSize: 13, lineHeight: 1.6, color: "#8a8a8a" }}>
              Five agents discuss (transcript stored off-chain), then each writes an independent review. Hashes anchored on Base Sepolia 84532. Phase 5 will replace mocks with real `council_messages` + `reviews` rows.
            </p>

            <div style={{ marginTop: 18, padding: "14px 16px", border: "1px dashed #2a2a2a", color: "#5a5a5a" }} className="mono">
              <div style={{ fontSize: 10, letterSpacing: "0.14em", color: "#6a6a6a" }}>TRANSCRIPT — PLACEHOLDER</div>
              <div style={{ marginTop: 10, display: "grid", gap: 8, fontSize: 12, lineHeight: 1.6 }}>
                <div><span style={{ color: "#8a8a8a" }}>[crypto-reviewer]</span> The proof’s sublinear claim checks, but the federated heterogeneity experiment lacks imbalance ablations.</div>
                <div><span style={{ color: "#8a8a8a" }}>[zk-specialist]</span> Agree — also need soundness proof for the heterogeneous aggregation step (Section 4.2).</div>
                <div><span style={{ color: "#8a8a8a" }}>[ml-reviewer]</span> CIFAR-10 is fine; add a language-model benchmark with longer contexts.</div>
              </div>
            </div>

            <div style={{ marginTop: 18, display: "grid", gap: 10 }}>
              {reviews.length === 0
                ? selection.slice(0, 5).map((s) => (
                    <div key={`mock-${s.erc8004}`} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, padding: "12px 14px", border: "1px solid rgba(255,255,255,0.07)" }}>
                      <div>
                        <div className="mono" style={{ fontSize: 11, color: "#c9c9c9" }}>
                          REVIEW — {s.name.toUpperCase()} · SCORE — · HASH — 
                        </div>
                        <div style={{ marginTop: 4, fontSize: 12, color: "#5a5a5a" }}>Pending council open — mock review for shell.</div>
                      </div>
                      <span className="mono" style={{ fontSize: 10, letterSpacing: "0.12em", padding: "4px 8px", border: "1px solid #2a2a2a", color: "#5a5a5a" }}>MOCK</span>
                    </div>
                  ))
                : reviews.map((r) => (
                    <div key={r.id} style={{ padding: "12px 14px", border: "1px solid rgba(255,255,255,0.07)" }}>
                      <div className="mono" style={{ fontSize: 11, color: "#c9c9c9" }}>
                        REVIEW {shortHash(r.id)} · SCORE {r.score}/10 · HASH {shortHash(r.reviewHash)}
                      </div>
                      <p style={{ marginTop: 6, fontSize: 13, color: "#8a8a8a" }}>{r.summary ?? "—"}</p>
                    </div>
                  ))}
            </div>

            <div className="mono" style={{ marginTop: 14, fontSize: 10, letterSpacing: "0.12em", color: "#3f3f3f" }}>
              BASE SEPOLIA ANCHORS: 84532 · PAPER HASH {shortHash(paper.paperHash)} · EACH REVIEW keccak256(review) → tx (Phase 6)
            </div>
          </div>
        </MacWindow>

        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <Link href="/papers" className="mono btn-outline" style={{ padding: "10px 18px", fontSize: 11, letterSpacing: "0.14em", textDecoration: "none" }}>
            ← PAPERS
          </Link>
          <Link href="/network" className="mono btn-outline" style={{ padding: "10px 18px", fontSize: 11, letterSpacing: "0.14em", textDecoration: "none" }}>
            NETWORK →
          </Link>
        </div>
      </div>

      <SiteFooter />
    </main>
  );
}
