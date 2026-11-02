"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { PageHead, Panel, StatRow } from "@/components/ConsoleBits";
import { useWallet } from "@/components/WalletProvider";
import { RAAC_DOMAIN, RAAC_TYPES } from "@/lib/council-message";

type Paper = {
  id: string;
  title: string;
  domain: string;
  status: string;
  paperHash: string;
  authorAddress: string;
  createdAt: string;
};

type Selection = {
  agent_key: string;
  name: string;
  erc8004: string;
  score: number;
  domainReviews: number;
  validation: string;
};

type Detail = {
  paper: Paper;
  council: { id: string; status: string; selectionHash: string } | null;
  selection: Selection[];
  reviews: Array<{ id: string; agentId: string; score: number; reviewHash: string; summary: string | null }>;
};

function shortHash(h: string) {
  return `${h.slice(0, 8)}…${h.slice(-6)}`;
}

// Linear pipeline position derived from paper + council state.
// 1 submit → 2 council → 3 signature → 4 run → 5 anchor/view
function stepOf(d: Detail | null): number {
  if (!d) return 1;
  if (!d.council) return 2;
  if (d.council.status === "proposed") return 3;
  if (d.council.status === "active") return d.reviews.length >= 5 ? 5 : 4;
  return 5;
}

function StepShell({ n, title, state, children }: { n: number; title: string; state: "done" | "current" | "locked"; children?: React.ReactNode }) {
  const dim = state === "locked";
  return (
    <div style={{ display: "flex", gap: 12, opacity: dim ? 0.45 : 1 }}>
      <div
        className="mono"
        style={{
          width: 26, height: 26, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 11, border: "1px solid #2a2a2a",
          background: state === "done" ? "#e8e8e8" : state === "current" ? "transparent" : "#0a0a0a",
          color: state === "done" ? "#000" : state === "current" ? "#e8e8e8" : "#5a5a5a",
          animation: state === "current" ? "raac-pulse 1.6s ease-in-out infinite" : undefined,
        }}
      >
        {state === "done" ? "✓" : n}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="mono" style={{ fontSize: 10, letterSpacing: "0.14em", color: state === "locked" ? "#5a5a5a" : "#c9c9c9" }}>
          STEP {n} — {title} {state === "done" ? "· DONE" : state === "current" ? "· YOU ARE HERE" : ""}
        </div>
        {!dim && <div style={{ marginTop: 10 }}>{children}</div>}
      </div>
    </div>
  );
}

export default function ConsoleOverviewPage() {
  return (
    <Suspense>
      <ConsoleOverview />
    </Suspense>
  );
}

function ConsoleOverview() {
  const { address } = useWallet();
  const searchParams = useSearchParams();
  const [papers, setPapers] = useState<Paper[] | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [stats, setStats] = useState<{ papers_submitted: number; councils_formed: number; reviews_submitted: number; reviews_anchored: number } | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [arxivUrl, setArxivUrl] = useState("");
  const [tab, setTab] = useState<"mine" | "all">("all");
  const [anchored, setAnchored] = useState(0);

  const myPapers = address && papers ? papers.filter((p) => p.authorAddress.toLowerCase() === address.toLowerCase()) : [];

  const loadPapers = (select?: string) => {
    fetch("/api/papers", { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => {
        if (!j.ok) throw new Error(j.error?.message);
        const list = j.data as Paper[];
        setPapers(list);
        if (select) {
          setSelectedId(select);
        } else if (!selectedId && list.length) {
          const mine = address ? list.find((p) => p.authorAddress.toLowerCase() === address.toLowerCase()) : undefined;
          setSelectedId((mine ?? list[0]).id);
          if (mine) setTab("mine");
        }
      })
      .catch((e) => setMsg(e.message));
  };

  const loadDetail = (id: string) => {
    fetch(`/api/papers/${id}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => {
        if (!j.ok) return;
        setDetail(j.data as Detail);
        if ((j.data.council?.status === "completed") || (j.data.reviews?.length ?? 0) >= 5) {
          fetch(`/api/papers/${id}/anchor`, { cache: "no-store" }).then((r) => r.json()).then((a) => {
            if (a.ok && a.data.reviews) setAnchored((a.data.reviews as Array<{ anchorTxHash?: string }>).filter((r) => r.anchorTxHash).length);
          }).catch(() => {});
        }
      })
      .catch(() => {});
  };

  useEffect(() => {
    // Deep link from the PAPERS tab: /console?paper=<id> loads it in the pipeline.
    const requested = searchParams.get("paper");
    loadPapers(requested ?? undefined);
    fetch("/api/network/stats", { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => { if (j.ok) setStats(j.data); })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (selectedId) loadDetail(selectedId);
    else setDetail(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  // When wallet connects and owns papers, switch to the wallet tab.
  useEffect(() => {
    if (address && papers && papers.some((p) => p.authorAddress.toLowerCase() === address.toLowerCase())) setTab("mine");
    else if (!address) setTab("all");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [address]);

  // Step label from paper status alone (no detail fetch needed for the list).
  const stepLabel = (status: string) =>
    status === "completed" ? "STEP 5" : status === "reviewing" ? "STEP 4" : status === "council_proposed" ? "STEP 3" : "STEP 2";

  // Single poll loop while the council is mid-run — drives the progress bar.
  const step = stepOf(detail);
  const running = busy === "run" || (detail?.council?.status === "active" && (detail?.reviews.length ?? 0) < 5);
  useEffect(() => {
    if (!selectedId || !running) return;
    const iv = setInterval(() => loadDetail(selectedId), 2000);
    return () => clearInterval(iv);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, running, detail?.reviews.length]);

  const submitArxiv = async () => {
    const url = arxivUrl.trim();
    if (!url) { setMsg("Paste an arXiv URL — e.g. https://arxiv.org/abs/1706.03762"); return; }
    if (!url.includes("arxiv.org") && !/^\d{4}\.\d{4,5}/.test(url)) { setMsg("Invalid arXiv URL or ID"); return; }
    setBusy("submit");
    setMsg(null);
    try {
      const res = await fetch("/api/papers", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ arxivUrl: url, authorAddress: address && /^0x[0-9a-fA-F]{40}$/.test(address) ? address : undefined }),
      });
      const j = await res.json();
      if (!j.ok) throw new Error(j.error?.message ?? "submit failed");
      setMsg(`SUBMITTED ${j.data.title.slice(0, 40)}… → proposing council…`);
      setArxivUrl("");
      // Linear flow: propose immediately so step 2 is already done on arrival.
      try {
        const pr = await fetch(`/api/papers/${j.data.id}/selection`, { method: "POST" });
        const pj = await pr.json();
        if (!pj.ok) throw new Error(pj.error?.message ?? "propose failed");
        setMsg(`SUBMITTED + COUNCIL PROPOSED → sign it in step 3 below`);
      } catch (e) {
        setMsg(`SUBMITTED — auto-propose failed (${e instanceof Error ? e.message : e}), use step 2 retry`);
      }
      loadPapers(j.data.id);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  };

  const propose = async () => {
    if (!selectedId) return;
    setBusy("propose");
    setMsg(null);
    try {
      const r = await fetch(`/api/papers/${selectedId}/selection`, { method: "POST" });
      const j = await r.json();
      if (!j.ok) throw new Error(j.error?.message);
      setMsg(`COUNCIL PROPOSED → sign it in step 3`);
      loadDetail(selectedId);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  };

  const sign = async () => {
    if (!selectedId || !detail?.council) return;
    if (!address) {
      setMsg("CONNECT WALLET FIRST — 84532");
      return;
    }
    setBusy("sign");
    setMsg(null);
    try {
      const anyWindow = window as unknown as { ethereum?: { request: (a: unknown) => Promise<string> } };
      if (!anyWindow.ethereum) throw new Error("No injected wallet — switch to Base Sepolia 84532");
      const typedData = JSON.stringify({
        types: {
          EIP712Domain: [
            { name: "name", type: "string" },
            { name: "version", type: "string" },
            { name: "chainId", type: "uint256" },
            { name: "verifyingContract", type: "address" },
          ],
          ...RAAC_TYPES,
        },
        primaryType: "CouncilFormation",
        domain: RAAC_DOMAIN,
        message: { paperId: detail.paper.id, paperHash: detail.paper.paperHash, selectionHash: detail.council.selectionHash, author: address },
      });
      const signature = await anyWindow.ethereum.request({ method: "eth_signTypedData_v4", params: [address, typedData] } as unknown as never) as string;
      const r = await fetch(`/api/papers/${selectedId}/council/verify`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ signature, author: address }),
      });
      const j = await r.json();
      if (!j.ok) throw new Error(j.error?.message);
      setMsg(`SIGNED — council active → run it in step 4`);
      loadDetail(selectedId);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  };

  const run = async () => {
    if (!selectedId) return;
    setBusy("run");
    setMsg(null);
    try {
      const r = await fetch(`/api/papers/${selectedId}/council/run`, { method: "POST" });
      const j = await r.json();
      if (!j.ok) throw new Error(j.error?.message);
      setMsg(`RAN — ${j.data.reviews.length}/5 reviews → anchor them in step 5`);
      loadDetail(selectedId);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
      if (selectedId) loadDetail(selectedId);
    }
  };

  const anchor = async () => {
    if (!selectedId) return;
    setBusy("anchor");
    setMsg(null);
    try {
      const r = await fetch(`/api/papers/${selectedId}/anchor`, { method: "POST" });
      const j = await r.json();
      if (!j.ok) throw new Error(j.error?.message);
      setMsg(`ANCHORED ${j.data.anchored.length} REVIEWS ON 84532 → see Basescan links on the paper page`);
      setAnchored(j.data.anchored.length);
      loadDetail(selectedId);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  };

  const reviewCount = detail?.reviews.length ?? 0;
  const isMine = !!detail && !!address && detail.paper.authorAddress.toLowerCase() === address.toLowerCase();

  return (
    <div>
      <style>{`@keyframes raac-pulse { 0%,100%{opacity:1} 50%{opacity:0.25}} @keyframes raac-shimmer { 0%{background-position:-200% 0} 100%{background-position:200% 0}}`}</style>
      <PageHead
        eyebrow="CONSOLE — RAAC DEMO"
        title="One paper, five steps."
        sub="Follow the steps top to bottom — each unlocks the next. All on Base Sepolia 84532."
      />

      <StatRow
        stats={[
          { value: String(stats?.papers_submitted ?? papers?.length ?? "—"), label: "PAPERS" },
          { value: String(stats?.councils_formed ?? "—"), label: "COUNCILS" },
          { value: String(stats?.reviews_submitted ?? "—"), label: "REVIEWS" },
          { value: String(stats?.reviews_anchored ?? "—"), label: "ANCHORED" },
          { value: "84532", label: "CHAIN" },
        ]}
      />

      <div style={{ marginTop: 18, display: "grid", gap: 16 }}>
        <Panel title="PIPELINE — FOLLOW THE STEPS">
          <div style={{ display: "grid", gap: 18 }}>
            <StepShell n={1} title="SUBMIT PAPER" state={detail ? "done" : "current"}>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                <input
                  value={arxivUrl}
                  onChange={(e) => setArxivUrl(e.target.value)}
                  placeholder="https://arxiv.org/abs/1706.03762 or 1706.03762"
                  style={{ flex: "1 1 320px", minWidth: 240, background: "#0a0a0a", border: "1px solid #2a2a2a", color: "#e8e8e8", padding: "11px 14px", fontSize: 13, outline: "none" }}
                />
                <button onClick={submitArxiv} disabled={busy === "submit"} className="mono" style={{ padding: "11px 18px", fontSize: 11, letterSpacing: "0.14em", cursor: busy === "submit" ? "wait" : "pointer", background: "#f4f4f4", color: "#000", border: "1px solid #f4f4f4" }}>
                  {busy === "submit" ? "SUBMITTING…" : detail ? "SUBMIT ANOTHER →" : "SUBMIT ARXIV →"}
                </button>
              </div>
              <div className="mono" style={{ marginTop: 8, fontSize: 9, letterSpacing: "0.08em", color: "#3f3f3f" }}>
                {!address ? "WALLET NOT CONNECTED — submit works, but signing later needs it." : `AUTHOR WILL BE ${address.slice(0, 6)}…${address.slice(-4)} ON 84532.`} WE FETCH TITLE/ABSTRACT/DOMAIN FROM ARXIV AUTOMATICALLY.
              </div>
              {papers && papers.length > 0 && (
                <div style={{ marginTop: 14 }}>
                  <div className="mono" style={{ fontSize: 9, letterSpacing: "0.14em", color: "#5a5a5a", marginBottom: 8 }}>
                    {address ? `CONSOLE PAPERS — ${address.slice(0, 6)}…${address.slice(-4)} SEES THEIRS BELOW · /PAPERS STAYS GLOBAL` : "CONNECT WALLET — EACH WALLET GETS ITS OWN PAPER TAB HERE · /PAPERS STAYS GLOBAL"}
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    {([
                      { id: "mine" as const, label: `MY PAPERS (${myPapers.length})` },
                      { id: "all" as const, label: `ALL PAPERS (${papers.length})` },
                    ]).map((t) => (
                      <button
                        key={t.id}
                        onClick={() => setTab(t.id)}
                        className="mono"
                        style={{
                          padding: "8px 14px", fontSize: 10, letterSpacing: "0.12em", cursor: "pointer",
                          background: tab === t.id ? "#e8e8e8" : "transparent",
                          color: tab === t.id ? "#000" : "#8a8a8a",
                          border: "1px solid #2a2a2a",
                        }}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                  <div style={{ marginTop: 8, display: "grid", gap: 8 }}>
                    {(tab === "mine" ? myPapers : papers).map((p) => (
                      <button
                        key={p.id}
                        onClick={() => setSelectedId(p.id)}
                        className="mono"
                        style={{
                          display: "flex", gap: 10, alignItems: "center", textAlign: "left", cursor: "pointer",
                          padding: "10px 12px", fontSize: 10, letterSpacing: "0.06em",
                          background: p.id === selectedId ? "rgba(255,255,255,0.04)" : "transparent",
                          color: p.id === selectedId ? "#e8e8e8" : "#8a8a8a",
                          border: p.id === selectedId ? "1px solid rgba(255,255,255,0.2)" : "1px solid #1e1e1e",
                        }}
                      >
                        <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {p.title.slice(0, 52)}{p.title.length > 52 ? "…" : ""}
                        </span>
                        <span style={{ color: "#5a5a5a", flexShrink: 0 }}>{p.domain.toUpperCase()}</span>
                        <span style={{ color: p.status === "completed" ? "#e8e8e8" : "#8a8a8a", flexShrink: 0 }}>{p.status.toUpperCase()}</span>
                        <span style={{ color: "#3f3f3f", flexShrink: 0 }}>{stepLabel(p.status)}</span>
                      </button>
                    ))}
                    {tab === "mine" && myPapers.length === 0 && (
                      <div className="mono" style={{ padding: "10px 12px", fontSize: 10, letterSpacing: "0.1em", color: "#5a5a5a", border: "1px dashed #2a2a2a" }}>
                        {address ? "NO PAPERS SIGNED BY THIS WALLET YET — SUBMIT ABOVE, IT LANDS HERE." : "CONNECT WALLET TO SEE YOUR PAPERS — EACH WALLET MANAGES ITS OWN."}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </StepShell>

            <StepShell n={2} title="COUNCIL PROPOSED" state={!detail ? "locked" : detail.council ? "done" : step === 2 ? "current" : "locked"}>
              {detail && !detail.council && (
                <>
                  <p style={{ fontSize: 13, lineHeight: 1.6, color: "#8a8a8a" }}>Rank the agent network for <span className="mono" style={{ color: "#c9c9c9" }}>{detail.paper.domain.toUpperCase()}</span> via The Graph — top 5 by reputation + domain history.</p>
                  <button onClick={propose} disabled={busy === "propose"} className="mono btn-outline" style={{ marginTop: 10, padding: "10px 18px", fontSize: 11, letterSpacing: "0.14em", cursor: "pointer" }}>
                    {busy === "propose" ? "RANKING…" : "PROPOSE COUNCIL →"}
                  </button>
                </>
              )}
              {detail?.council && (
                <div style={{ display: "grid", gap: 8 }}>
                  {detail.selection.slice(0, 5).map((s, i) => (
                    <div key={s.agent_key} className="mono" style={{ display: "flex", gap: 10, fontSize: 11, color: "#c9c9c9" }}>
                      <span style={{ color: "#5a5a5a" }}>{String(i + 1).padStart(2, "0")}</span>
                      <span style={{ flex: 1 }}>{s.name} · {s.erc8004}</span>
                      <span>{s.score.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              )}
            </StepShell>

            <StepShell n={3} title="AUTHOR SIGNS" state={!detail?.council ? "locked" : detail.council.status !== "proposed" ? "done" : "current"}>
              {detail?.council?.status === "proposed" && (
                <>
                  <p style={{ fontSize: 13, lineHeight: 1.6, color: "#8a8a8a" }}>Sign council formation (EIP-712) with your wallet. No signature, no review.</p>
                  <button onClick={sign} disabled={busy === "sign"} className="mono btn-outline" style={{ marginTop: 10, padding: "10px 18px", fontSize: 11, letterSpacing: "0.14em", cursor: "pointer" }}>
                    {busy === "sign" ? "SIGNING…" : address ? `SIGN AS ${address.slice(0, 6)}…${address.slice(-4)} →` : "CONNECT WALLET TO SIGN"}
                  </button>
                </>
              )}
              {detail?.council && detail.council.status !== "proposed" && (
                <div className="mono" style={{ fontSize: 11, color: "#8a8a8a" }}>SIGNED {shortHash(detail.council.selectionHash)} · COUNCIL {detail.council.status.toUpperCase()}</div>
              )}
            </StepShell>

            <StepShell n={4} title="COUNCIL RUNS" state={detail?.council?.status !== "active" ? (step === 5 ? "done" : "locked") : "current"}>
              {detail?.council?.status === "active" && (
                <>
                  <p style={{ fontSize: 13, lineHeight: 1.6, color: "#8a8a8a" }}>
                    {reviewCount === 0 ? "Five agents discuss, then each writes an independent review. Takes a few minutes — watch them arrive below." : reviewCount < 5 ? `Interrupted run resumed — ${reviewCount}/5 already in, generating the rest.` : "All 5 reviews in."}
                  </p>
                  {reviewCount < 5 && (
                    <button onClick={run} disabled={busy === "run"} className="mono btn-outline" style={{ marginTop: 10, padding: "10px 18px", fontSize: 11, letterSpacing: "0.14em", cursor: busy === "run" ? "wait" : "pointer", background: busy === "run" ? "#111" : "transparent" }}>
                      {busy === "run" ? `RUNNING ${reviewCount}/5…` : reviewCount === 0 ? "RUN COUNCIL →" : `RESUME — ${reviewCount}/5 →`}
                    </button>
                  )}
                  <div style={{ marginTop: 12, display: "flex", gap: 4 }}>
                    {[0, 1, 2, 3, 4].map((i) => (
                      <div key={i} style={{ flex: 1, height: 6, background: i < reviewCount ? "#e8e8e8" : "#1a1a1a", border: "1px solid #2a2a2a", transition: "background 0.4s" }} />
                    ))}
                  </div>
                  {busy === "run" && (
                    <div className="mono" style={{ marginTop: 8, fontSize: 10, letterSpacing: "0.12em", color: "#e8e8e8", display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ width: 7, height: 7, background: "#e8e8e8", display: "inline-block", animation: "raac-pulse 1s ease-in-out infinite" }} />
                      {reviewCount}/5 REVIEWS — EACH APPEARS AS ITS AGENT FINISHES, NO REFRESH
                    </div>
                  )}
                </>
              )}
            </StepShell>

            <StepShell n={5} title="REVIEWS + ANCHOR" state={step === 5 ? "current" : "locked"}>
              {step === 5 && detail && (
                <>
                  <div className="mono" style={{ fontSize: 11, color: "#c9c9c9" }}>{reviewCount}/5 REVIEWS {anchored > 0 ? `· ${anchored} ANCHORED ON 84532` : "· NOT YET ANCHORED"}</div>
                  <div style={{ marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap" }}>
                    {anchored < reviewCount && (
                      <button onClick={anchor} disabled={busy === "anchor"} className="mono btn-outline" style={{ padding: "10px 18px", fontSize: 11, letterSpacing: "0.14em", cursor: "pointer" }}>
                        {busy === "anchor" ? "ANCHORING…" : "ANCHOR ON 84532 →"}
                      </button>
                    )}
                    <Link href={`/papers/${detail.paper.id}`} className="mono btn-outline" style={{ padding: "10px 18px", fontSize: 11, letterSpacing: "0.14em", textDecoration: "none" }}>
                      READ REVIEWS →
                    </Link>
                    <Link href="/network" className="mono btn-outline" style={{ padding: "10px 18px", fontSize: 11, letterSpacing: "0.14em", textDecoration: "none" }}>
                      NETWORK →
                    </Link>
                  </div>
                </>
              )}
            </StepShell>
          </div>
        </Panel>
      </div>

      {msg && <div className="mono" style={{ marginTop: 14, fontSize: 11, letterSpacing: "0.08em", color: "#c9c9c9" }}>{msg}</div>}
      {detail && (
        <div style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <Link href={`/papers/${detail.paper.id}`} className="mono btn-outline" style={{ padding: "10px 18px", fontSize: 11, letterSpacing: "0.14em", textDecoration: "none" }}>
            OPEN PAPER → {reviewCount}/5 REVIEWS
          </Link>
          <span className="mono" style={{ fontSize: 9, letterSpacing: "0.1em", color: "#3f3f3f" }}>WORKING ON: {detail.paper.title.slice(0, 50)} · {detail.paper.status.toUpperCase()} {isMine ? "· YOURS" : "· GLOBAL"}</span>
        </div>
      )}

      <div className="mono" style={{ marginTop: 18, fontSize: 9.5, letterSpacing: "0.12em", color: "#3f3f3f" }}>
        FLOW: SUBMIT (ARXIV) → PROPOSE (GRAPH RANK → TOP 5) → SIGN (EIP-712 → ACTIVE) → RUN (5 REVIEWS) → ANCHOR (84532) — ALL BASE SEPOLIA 84532.
      </div>
    </div>
  );
}
