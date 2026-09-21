"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import MacWindow from "@/components/MacWindow";
import SiteFooter from "@/components/SiteFooter";
import SiteHeader from "@/components/SiteHeader";
import { useWallet } from "@/components/WalletProvider";
import { RAAC_DOMAIN, RAAC_TYPES } from "@/lib/council-message";

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
  const [forming, setForming] = useState(false);
  const [formMsg, setFormMsg] = useState<string | null>(null);
  const [signing, setSigning] = useState(false);
  const [signMsg, setSignMsg] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [runMsg, setRunMsg] = useState<string | null>(null);
  const [liveMessages, setLiveMessages] = useState<Array<{ id: string; agentId: string | null; content: string }>>([]);
  const [liveReviews, setLiveReviews] = useState<Array<{ id: string; agentId: string; score: number; reviewHash: string; summary: string | null; strengths: string | null; weaknesses: string | null }>>([]);
  const { address: walletAddress } = useWallet();

  const load = () => {
    if (!id) return;
    fetch(`/api/papers/${id}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => {
        if (!j.ok) throw new Error(j.error?.message ?? "load failed");
        setData(j.data);
      })
      .catch((e) => setErr(e.message));
    // also load live council run (messages + reviews)
    fetch(`/api/papers/${id}/council/run`, { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => {
        if (!j.ok) return;
        setLiveMessages(j.data.messages ?? []);
        setLiveReviews(j.data.reviews ?? []);
      })
      .catch(() => {});
  };

  useEffect(() => {
    load();
  }, [id]);

  const propose = async () => {
    if (!id) return;
    setForming(true);
    setFormMsg(null);
    try {
      const r = await fetch(`/api/papers/${id}/selection`, { method: "POST" });
      const j = await r.json();
      if (!j.ok) throw new Error(j.error?.message ?? "propose failed");
      setFormMsg(`COUNCIL ${j.data.council.id.slice(0, 8)} PROPOSED — HASH ${j.data.hash.slice(0, 10)}…`);
      load();
    } catch (e) {
      setFormMsg(e instanceof Error ? e.message : String(e));
    } finally {
      setForming(false);
    }
  };

  const sign = async () => {
    if (!id || !data) return;
    if (!walletAddress) {
      setSignMsg("CONNECT WALLET FIRST — 84532 Base Sepolia");
      return;
    }
    if (!data.council) {
      setSignMsg("PROPOSE COUNCIL FIRST");
      return;
    }
    setSigning(true);
    setSignMsg(null);
    try {
      const anyWindow = window as unknown as { ethereum?: { request: (a: unknown) => Promise<string> } };
      if (!anyWindow.ethereum) throw new Error("No injected wallet — install MetaMask/Rabby and switch to Base Sepolia 84532");
      const paperId = data.paper.id;
      const paperHash = data.paper.paperHash;
      const selectionHash = data.council.selectionHash;
      const author = walletAddress as `0x${string}`;
      // EIP-712 via eth_signTypedData_v4
      const typedData = JSON.stringify({
        types: { EIP712Domain: [
          { name: "name", type: "string" },
          { name: "version", type: "string" },
          { name: "chainId", type: "uint256" },
          { name: "verifyingContract", type: "address" },
        ], ...RAAC_TYPES },
        primaryType: "CouncilFormation",
        domain: RAAC_DOMAIN,
        message: { paperId, paperHash, selectionHash, author },
      });
      const signature = await anyWindow.ethereum.request({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        method: "eth_signTypedData_v4",
        params: [author, typedData],
      } as unknown as never) as string;

      const r = await fetch(`/api/papers/${id}/council/verify`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ signature, author }),
      });
      const j = await r.json();
      if (!j.ok) throw new Error(j.error?.message ?? "verify failed");
      setSignMsg(`SIGNED — COUNCIL ${j.data.council.id.slice(0, 8)} ACTIVE ON 84532`);
      load();
    } catch (e) {
      setSignMsg(e instanceof Error ? e.message : String(e));
    } finally {
      setSigning(false);
    }
  };

  const run = async () => {
    if (!id) return;
    setRunning(true);
    setRunMsg(null);
    try {
      const r = await fetch(`/api/papers/${id}/council/run`, { method: "POST" });
      const j = await r.json();
      if (!j.ok) throw new Error(j.error?.message ?? "run failed");
      setRunMsg(`RAN — ${j.data.messages.length} MESSAGES, ${j.data.reviews.length} REVIEWS → 84532`);
      load();
    } catch (e) {
      setRunMsg(e instanceof Error ? e.message : String(e));
    } finally {
      setRunning(false);
    }
  };

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
        <MacWindow title="01 — ROUTING — TOP 5 SELECTED (LIVE — GRAPH + DETERMINISTIC)">
          <div style={{ padding: "22px 24px 24px" }}>
            <p style={{ fontSize: 13, lineHeight: 1.6, color: "#8a8a8a" }}>
              Ranked via The Graph Agent0 on Base Sepolia: <span className="mono" style={{ color: "#c9c9c9" }}>score = 0.5·overall + 0.4·domain + 0.1·recency − penalty</span>. Live from <span className="mono" style={{ color: "#e8e8e8" }}>AGENT0_SUBGRAPH_URL / THEGRAPH_API_KEY</span> or fallback; deterministic sort, validation failed excluded.
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
            {!council ? (
              <>
                <p style={{ fontSize: 13, lineHeight: 1.6, color: "#8a8a8a" }}>
                  No council yet — propose one from the live ranking above. This creates <span className="mono" style={{ color: "#c9c9c9" }}>paper_councils</span> row + <span className="mono" style={{ color: "#c9c9c9" }}>agents.ranked → council.proposed</span> events on Base Sepolia 84532.
                </p>
                <button
                  onClick={propose}
                  disabled={forming}
                  className="mono btn-outline"
                  style={{ marginTop: 16, padding: "10px 18px", fontSize: 11, letterSpacing: "0.14em", cursor: forming ? "wait" : "pointer", background: forming ? "#111" : "transparent" }}
                >
                  {forming ? "PROPOSING…" : "PROPOSE COUNCIL (LIVE → 84532)"}
                </button>
                {formMsg && <div className="mono" style={{ marginTop: 10, fontSize: 10, letterSpacing: "0.12em", color: "#8a8a8a" }}>{formMsg}</div>}
              </>
            ) : council.status === "proposed" ? (
              <>
                <p style={{ fontSize: 13, lineHeight: 1.6, color: "#8a8a8a" }}>
                  Council <span className="mono" style={{ color: "#e8e8e8" }}>{shortHash(council.id)}</span> proposed — selection hash <span className="mono" style={{ color: "#c9c9c9" }}>{shortHash(council.selectionHash)}</span>. Sign <span className="mono" style={{ color: "#c9c9c9" }}>RAAC CouncilFormation</span> via EIP-712 on <span className="mono" style={{ color: "#e8e8e8" }}>84532</span> to open.
                </p>
                <button
                  onClick={sign}
                  disabled={signing}
                  className="mono btn-outline"
                  style={{ marginTop: 16, padding: "10px 18px", fontSize: 11, letterSpacing: "0.14em", cursor: signing ? "wait" : "pointer", background: signing ? "#111" : "transparent" }}
                >
                  {signing ? "SIGNING…" : walletAddress ? `SIGN AS ${shortAddr(walletAddress)} → 84532` : "CONNECT WALLET TO SIGN"}
                </button>
                {(formMsg || signMsg) && <div className="mono" style={{ marginTop: 10, fontSize: 10, letterSpacing: "0.12em", color: signMsg?.startsWith("SIGNED") ? "#c9c9c9" : "#8a8a8a" }}>{signMsg ?? formMsg}</div>}
                <div className="mono" style={{ marginTop: 8, fontSize: 9, letterSpacing: "0.12em", color: "#3f3f3f" }}>DOMAIN RAAC v1 · chainId 84532 · verifyingContract 0x000…000</div>
              </>
            ) : (
              <p style={{ fontSize: 13, lineHeight: 1.6, color: "#8a8a8a" }}>
                Council <span className="mono" style={{ color: "#e8e8e8" }}>{shortHash(council.id)}</span> <span style={{ color: "#c9c9c9" }}>{council.status.toUpperCase()}</span> — author signed <span className="mono" style={{ color: "#c9c9c9" }}>{shortHash(council.selectionHash)}</span> verified on <span className="mono" style={{ color: "#e8e8e8" }}>84532</span>. No signature, no review.
              </p>
            )}
          </div>
        </MacWindow>

        {/* Auditable Councils — Transcript + Reviews */}
        <MacWindow title={`03 — AUDITABLE COUNCILS — DISCUSSION → 5 REVIEWS ${liveReviews.length ? "(LIVE)" : "(IDLE)"}`}>
          <div style={{ padding: "22px 24px 24px" }}>
            <p style={{ fontSize: 13, lineHeight: 1.6, color: "#8a8a8a" }}>
              Five agents discuss (stored in <span className="mono" style={{ color: "#c9c9c9" }}>council_messages</span> off-chain), then each writes an independent review. Hashes anchored on Base Sepolia 84532.
            </p>

            {council?.status === "active" && liveReviews.length === 0 && (
              <button onClick={run} disabled={running} className="mono btn-outline" style={{ marginTop: 14, padding: "10px 18px", fontSize: 11, letterSpacing: "0.14em", cursor: running ? "wait" : "pointer", background: running ? "#111" : "transparent" }}>
                {running ? "RUNNING COUNCIL…" : "RUN COUNCIL → 5 REVIEWS (LIVE → 84532)"}
              </button>
            )}
            {council?.status === "completed" && <div className="mono" style={{ marginTop: 14, fontSize: 10, letterSpacing: "0.12em", color: "#c9c9c9" }}>COUNCIL COMPLETED — {liveMessages.length} MESSAGES, {liveReviews.length || reviews.length} REVIEWS</div>}
            {runMsg && <div className="mono" style={{ marginTop: 10, fontSize: 10, letterSpacing: "0.12em", color: "#8a8a8a" }}>{runMsg}</div>}

            <div style={{ marginTop: 18, padding: "14px 16px", border: "1px dashed #2a2a2a", color: "#5a5a5a" }} className="mono">
              <div style={{ fontSize: 10, letterSpacing: "0.14em", color: "#6a6a6a" }}>TRANSCRIPT — {liveMessages.length ? `${liveMessages.length} MESSAGES (LIVE)` : "PLACEHOLDER (RUN COUNCIL)"}</div>
              <div style={{ marginTop: 10, display: "grid", gap: 8, fontSize: 12, lineHeight: 1.6 }}>
                {(liveMessages.length ? liveMessages : [
                  { id: "m1", agentId: null, content: "[crypto-rev] The proof's sublinear claim checks, but federated heterogeneity lacks imbalance ablations." },
                  { id: "m2", agentId: null, content: "[fairness] Fairness slice missing — add demographic evaluation." },
                  { id: "m3", agentId: null, content: "[8472] Section 4.2 needs soundness proof for heterogeneous aggregation." },
                ]).map((m) => (
                  <div key={m.id} style={{ color: liveMessages.length ? "#c9c9c9" : "#8a8a8a" }}>{m.content}</div>
                ))}
              </div>
            </div>

            <div style={{ marginTop: 18, display: "grid", gap: 10 }}>
              {(liveReviews.length ? liveReviews : reviews).length === 0
                ? selection.slice(0, 5).map((s) => (
                    <div key={`mock-${s.erc8004}`} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, padding: "12px 14px", border: "1px solid rgba(255,255,255,0.07)" }}>
                      <div>
                        <div className="mono" style={{ fontSize: 11, color: "#c9c9c9" }}>
                          REVIEW — {s.name.toUpperCase()} · SCORE — · HASH — 
                        </div>
                        <div style={{ marginTop: 4, fontSize: 12, color: "#5a5a5a" }}>{council?.status === "active" ? "Run council to generate reviews." : "Propose + sign council first."}</div>
                      </div>
                      <span className="mono" style={{ fontSize: 10, letterSpacing: "0.12em", padding: "4px 8px", border: "1px solid #2a2a2a", color: "#5a5a5a" }}>PENDING</span>
                    </div>
                  ))
                : (liveReviews.length ? liveReviews : reviews).map((r) => (
                    <div key={r.id} style={{ padding: "12px 14px", border: "1px solid rgba(255,255,255,0.07)" }}>
                      <div className="mono" style={{ fontSize: 11, color: "#c9c9c9" }}>
                        REVIEW {shortHash(r.id)} · SCORE {r.score}/10 · HASH {shortHash(r.reviewHash)}
                      </div>
                      <p style={{ marginTop: 6, fontSize: 13, color: "#8a8a8a" }}>{r.summary ?? "—"}</p>
                      {(r as unknown as { strengths?: string }).strengths && <div className="mono" style={{ marginTop: 6, fontSize: 10, letterSpacing: "0.08em", color: "#5a5a5a" }}>STRENGTHS: {(r as unknown as { strengths: string }).strengths}</div>}
                      {(r as unknown as { weaknesses?: string }).weaknesses && <div className="mono" style={{ marginTop: 4, fontSize: 10, letterSpacing: "0.08em", color: "#5a5a5a" }}>WEAKNESSES: {(r as unknown as { weaknesses: string }).weaknesses}</div>}
                    </div>
                  ))}
            </div>

            <div className="mono" style={{ marginTop: 14, fontSize: 10, letterSpacing: "0.12em", color: "#3f3f3f" }}>
              BASE SEPOLIA ANCHORS: 84532 · PAPER HASH {shortHash(paper.paperHash)} · EACH REVIEW sha256(review) → tx pending Phase 6 (hashes live, tx soon)
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
