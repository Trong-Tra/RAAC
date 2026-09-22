"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
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

function shortHash(h: string) {
  return `${h.slice(0, 8)}…${h.slice(-6)}`;
}

export default function ConsoleOverview() {
  const { address } = useWallet();
  const [papers, setPapers] = useState<Paper[] | null>(null);
  const [stats, setStats] = useState<{ papers_submitted: number; councils_formed: number; reviews_submitted: number; reviews_anchored: number } | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [arxivUrl, setArxivUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [liveCounts, setLiveCounts] = useState<Record<string, number>>({});

  const load = () => {
    fetch("/api/papers", { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => {
        if (!j.ok) throw new Error(j.error?.message);
        setPapers(j.data);
      })
      .catch((e) => setMsg(e.message));
  };

  useEffect(() => {
    load();
    fetch("/api/network/stats", { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => { if (j.ok) setStats(j.data); })
      .catch(() => {});
  }, []);

  const propose = async (id: string) => {
    setBusy(id);
    setMsg(null);
    try {
      const r = await fetch(`/api/papers/${id}/selection`, { method: "POST" });
      const j = await r.json();
      if (!j.ok) throw new Error(j.error?.message);
      setMsg(`PROPOSED ${j.data.council.id.slice(0, 8)} → 84532`);
      load();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  };

  const sign = async (paper: Paper) => {
    if (!address) {
      setMsg("CONNECT WALLET FIRST — 84532");
      return;
    }
    // need council + paperHash
    const detail = await fetch(`/api/papers/${paper.id}`, { cache: "no-store" }).then((r) => r.json());
    if (!detail.ok) {
      setMsg(detail.error?.message);
      return;
    }
    const council = detail.data.council;
    if (!council) {
      setMsg("PROPOSE FIRST");
      return;
    }
    setBusy(paper.id);
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
        message: { paperId: paper.id, paperHash: paper.paperHash, selectionHash: council.selectionHash, author: address },
      });
      const signature = await anyWindow.ethereum.request({ method: "eth_signTypedData_v4", params: [address, typedData] } as unknown as never) as string;
      const r = await fetch(`/api/papers/${paper.id}/council/verify`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ signature, author: address }),
      });
      const j = await r.json();
      if (!j.ok) throw new Error(j.error?.message);
      setMsg(`SIGNED ${j.data.council.id.slice(0, 8)} ACTIVE → 84532`);
      load();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  };

  const run = async (id: string) => {
    setBusy(id);
    setMsg(null);
    // poll live counts so each review appears as agent finishes (no refresh)
    const poll = setInterval(async () => {
      try {
        const rr = await fetch(`/api/papers/${id}/council/run`, { cache: "no-store" }).then((r) => r.json());
        if (rr.ok) setLiveCounts((m) => ({ ...m, [id]: (rr.data.reviews?.length ?? 0) }));
        if (rr.ok && (rr.data.reviews?.length ?? 0) >= 5) clearInterval(poll);
      } catch {}
    }, 1500);
    try {
      const r = await fetch(`/api/papers/${id}/council/run`, { method: "POST" });
      const j = await r.json();
      if (!j.ok) throw new Error(j.error?.message);
      setMsg(`RAN ${j.data.reviews.length} REVIEWS → 84532`);
      setLiveCounts((m) => ({ ...m, [id]: j.data.reviews.length }));
      load();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : String(e));
    } finally {
      clearInterval(poll);
      setBusy(null);
      // final poll to catch any last review
      fetch(`/api/papers/${id}/council/run`, { cache: "no-store" }).then((r)=>r.json()).then((jj)=>{ if(jj.ok) setLiveCounts((m)=>({...m,[id]:jj.data.reviews?.length??0}));}).catch(()=>{});
    }
  };

  const submitArxiv = async () => {
    const url = arxivUrl.trim();
    if (!url) { setMsg("Paste an arXiv URL — e.g. https://arxiv.org/abs/1706.03762"); return; }
    if (!url.includes("arxiv.org") && !/^\d{4}\.\d{4,5}/.test(url)) { setMsg("Invalid arXiv URL or ID"); return; }
    setSubmitting(true);
    setMsg(null);
    try {
      const res = await fetch("/api/papers", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ arxivUrl: url, authorAddress: address && /^0x[0-9a-fA-F]{40}$/.test(address) ? address : undefined }),
      });
      const j = await res.json();
      if (!j.ok) throw new Error(j.error?.message ?? "submit failed");
      setMsg(`SUBMITTED ${j.data.title.slice(0,40)}… → ${j.data.id.slice(0,8)} · ${j.data.domain}`);
      setArxivUrl("");
      load();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : String(e));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <style>{`@keyframes raac-pulse { 0%,100%{opacity:1} 50%{opacity:0.25}} @keyframes raac-shimmer { 0%{background-position:-200% 0} 100%{background-position:200% 0}}`}</style>
      <PageHead
        eyebrow="CONSOLE — RAAC DEMO"
        title="Papers → councils → reviews."
        sub="Your wallet-tied papers — submit arXiv, then propose → sign (84532) → run. All on Base Sepolia 84532. Routing · Accountability · Auditable Councils."
      />

      <StatRow
        stats={[
          { value: String(stats?.papers_submitted ?? papers?.length ?? "—"), label: "PAPERS" },
          { value: String(stats?.councils_formed ?? "—"), label: "COUNCILS" },
          { value: String(stats?.reviews_submitted ?? "—"), label: "REVIEWS" },
          { value: String(stats?.reviews_anchored ?? "—"), label: "ANCHORED" },
          { value: "5", label: "COUNCIL SIZE" },
          { value: "84532", label: "CHAIN" },
        ]}
      />

      <style>{`.arxiv-submit{background:#f4f4f4 !important;color:#000 !important;border:1px solid #f4f4f4 !important}.arxiv-submit:hover{background:#fff !important;color:#000 !important;border-color:#fff !important}.arxiv-submit:disabled{background:#2a2a2a !important;color:#8a8a8a !important;border-color:#2a2a2a !important;opacity:1 !important;cursor:wait !important}`}</style>
      {/* LIVE-DEMO: arXiv digest → mock network picks top 5 (always our 5) */}
      <div style={{ marginTop: 18, padding: "14px 16px", border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.02)", display: "grid", gap: 12 }}>
        <div className="mono" style={{ fontSize: 10, letterSpacing: "0.14em", color: "#6a6a6a" }}>LIVE-DEMO — ARXIV → DIGEST → 5 AGENTS (MOCK PICK, ALWAYS OUR 5)</div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <input value={arxivUrl} onChange={(e) => setArxivUrl(e.target.value)} placeholder="https://arxiv.org/abs/1706.03762 or 1706.03762" style={{ flex: "1 1 320px", minWidth: 240, background: "#0a0a0a", border: "1px solid #2a2a2a", color: "#e8e8e8", padding: "11px 14px", fontSize: 13, outline: "none" }} />
          <button onClick={submitArxiv} disabled={submitting} className="mono arxiv-submit" style={{ padding: "11px 18px", fontSize: 11, letterSpacing: "0.14em", cursor: submitting ? "wait" : "pointer" }}>
            {submitting ? "DIGESTING…" : "SUBMIT ARXIV → CONSOLE"}
          </button>
        </div>
        <div className="mono" style={{ fontSize: 9, letterSpacing: "0.08em", color: "#3f3f3f" }}>CONNECT WALLET FIRST → author is your 0x… on 84532; else 0xDead. We fetch title/abstract/categories from arXiv, hash sha256(arxivId|title) → paperHash, digest domain automatically.</div>
        {!address && <div className="mono" style={{ fontSize: 9, letterSpacing: "0.1em", color: "#8a8a8a" }}>⚠ Wallet not connected — submit will be 0xDead (demo). Connect to sign as yourself.</div>}
      </div>

      <div style={{ marginTop: 18, display: "flex", gap: 12, flexWrap: "wrap" }}>
        <Link href="/papers" className="mono btn-outline" style={{ padding: "10px 18px", fontSize: 11, letterSpacing: "0.14em", textDecoration: "none" }}>
          OPEN /PAPERS (GLOBAL) →
        </Link>
        <Link href="/network" className="mono btn-outline" style={{ padding: "10px 18px", fontSize: 11, letterSpacing: "0.14em", textDecoration: "none" }}>
          NETWORK →
        </Link>
      </div>

      {msg && <div className="mono" style={{ marginTop: 14, fontSize: 11, letterSpacing: "0.08em", color: msg.startsWith("SIGNED") || msg.startsWith("RAN") || msg.startsWith("PROPOSED") ? "#c9c9c9" : "#8a8a8a" }}>{msg}</div>}

      {(() => {
        if (!papers) return <div style={{ marginTop: 24 }}><Panel title="PAPERS — LOADING"><div className="mono" style={{ fontSize: 11, color: "#5a5a5a", letterSpacing: "0.12em" }}>LOADING…</div></Panel></div>;
        if (papers.length === 0) return <div style={{ marginTop: 24 }}><Panel title="PAPERS — EMPTY"><div style={{ fontSize: 13, color: "#8a8a8a" }}>No papers yet — submit an arXiv above as your wallet.</div></Panel></div>;
        const my = address ? papers.filter((p) => p.authorAddress.toLowerCase() === address.toLowerCase()) : [];
        const demo = papers.filter((p) => !address || p.authorAddress.toLowerCase() !== address.toLowerCase());
        const sections: Array<{ label: string; list: typeof papers; walletTied: boolean }> = [];
        if (address) sections.push({ label: `MY PAPERS — WALLET-TIED (${my.length}) · ${address.slice(0,6)}…${address.slice(-4)}`, list: my, walletTied: true });
        sections.push({ label: address ? `DEMO / GLOBAL PAPERS (${demo.length}) — 0xDead or other authors` : `PAPERS (${papers.length}) — CONNECT WALLET TO SEE YOURS`, list: address ? demo : papers, walletTied: false });
        return (
          <div style={{ marginTop: 24, display: "grid", gap: 24 }}>
            {sections.map((sec) => (
              <div key={sec.label}>
                <div className="mono" style={{ fontSize: 9, letterSpacing: "0.16em", color: sec.walletTied ? "#c9c9c9" : "#5a5a5a", marginBottom: 12 }}>{sec.label}</div>
                {sec.list.length === 0 ? (
                  <Panel title={sec.walletTied ? "NO WALLET PAPERS YET" : "EMPTY"}>
                    <div style={{ fontSize: 13, color: "#8a8a8a" }}>{sec.walletTied ? "Submit an arXiv above as your wallet — it will appear here, private to you. Global papers stay in /papers (anonymized)." : "No demo papers."}</div>
                  </Panel>
                ) : (
                  <div style={{ display: "grid", gap: 16 }}>
                    {sec.list.map((p) => {
                      const isRunning = busy === p.id;
                      const cnt = liveCounts[p.id] ?? 0;
                      const isMine = sec.walletTied;
                      return (
                        <Panel key={p.id} title={`${p.title.slice(0, 48)} — ${p.status.toUpperCase()} · ${p.domain.toUpperCase()} ${isMine ? "· YOURS" : ""}`}>
                          <div style={{ display: "grid", gap: 12 }}>
                            <div className="mono" style={{ fontSize: 10, letterSpacing: "0.12em", color: "#5a5a5a" }}>
                              {shortHash(p.paperHash)} · {new Date(p.createdAt).toLocaleDateString()} · {p.id.slice(0, 8)} {isMine ? "· WALLET-TIED" : "· GLOBAL DEMO"} {isRunning && `· ${cnt}/5 REVIEWS`}
                            </div>
                            {isRunning && (
                              <div style={{ display: "grid", gap: 6 }}>
                                <div className="mono" style={{ fontSize: 9, letterSpacing: "0.12em", color: "#e8e8e8", display: "flex", alignItems: "center", gap: 8 }}>
                                  <span style={{ width: 7, height: 7, background: "#e8e8e8", display: "inline-block", animation: "raac-pulse 1s ease-in-out infinite" }} />
                                  COUNCIL RUNNING — {cnt}/5 REVIEWS (each appears as agent finishes)
                                </div>
                                <div style={{ display: "flex", gap: 4 }}>
                                  {[0,1,2,3,4].map((i) => (
                                    <div key={i} style={{ flex: 1, height: 4, background: i < cnt ? "#e8e8e8" : "#1a1a1a", border: "1px solid #2a2a2a", transition: "background 0.4s" }} />
                                  ))}
                                </div>
                                <div style={{ height: 4, background: "linear-gradient(90deg, #1a1a1a 25%, #2a2a2a 50%, #1a1a1a 75%)", backgroundSize: "200% 100%", animation: "raac-shimmer 1.4s linear infinite", borderRadius: 2, opacity: 0.7 }} />
                              </div>
                            )}
                            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                              <button onClick={() => propose(p.id)} disabled={!!busy} className="mono btn-outline" style={{ padding: "8px 14px", fontSize: 10, letterSpacing: "0.12em", cursor: busy ? "wait" : "pointer", opacity: busy && busy!==p.id ? 0.5 : 1 }}>
                                PROPOSE
                              </button>
                              <button onClick={() => sign(p)} disabled={!!busy} className="mono btn-outline" style={{ padding: "8px 14px", fontSize: 10, letterSpacing: "0.12em", cursor: busy ? "wait" : "pointer", opacity: busy && busy!==p.id ? 0.5 : 1 }}>
                                SIGN (84532)
                              </button>
                              <button onClick={() => run(p.id)} disabled={!!busy} className="mono btn-outline" style={{ padding: "8px 14px", fontSize: 10, letterSpacing: "0.12em", cursor: busy ? "wait" : "pointer", background: isRunning ? "#111" : "transparent" }}>
                                {isRunning ? `RUNNING ${cnt}/5…` : "RUN → 5 REVIEWS"}
                              </button>
                              <Link href={`/papers/${p.id}`} className="mono btn-outline" style={{ padding: "8px 14px", fontSize: 10, letterSpacing: "0.12em", textDecoration: "none" }}>
                                OPEN → {isMine ? "PRIVATE" : "GLOBAL VIEW"}
                              </Link>
                            </div>
                            {!isMine && <div className="mono" style={{ fontSize: 9, letterSpacing: "0.08em", color: "#3f3f3f" }}>Global demo paper — private reviews still via OPEN (currently shared tenant; wallet tie on new submits).</div>}
                          </div>
                        </Panel>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>
        );
      })()}

      <div className="mono" style={{ marginTop: 18, fontSize: 9.5, letterSpacing: "0.12em", color: "#3f3f3f" }}>
        FLOW: PROPOSE (agents.ranked → council.proposed) → SIGN (EIP-712 on 84532 → signature.verified → council.opened) → RUN (discussion.message×5 + review.submitted×5 + paper.completed) — all Base Sepolia 84532.
      </div>
    </div>
  );
}
