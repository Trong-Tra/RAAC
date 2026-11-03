"use client";

import Link from "next/link";
import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import Plate from "@/components/Plate";
import SiteFooter from "@/components/SiteFooter";
import SiteHeader from "@/components/SiteHeader";
import { useWallet } from "@/components/WalletProvider";
import { RAAC_DOMAIN, RAAC_TYPES } from "@/lib/council-message";

type Paper = {
  id: string;
  title: string;
  abstract: string;
  domain: string;
  paperHash: string;
  status: string;
  authorAddress: string;
  feeAmountWei: string | null;
  createdAt: string;
};

type Selection = {
  agent_key: string;
  name: string;
  erc8004: string;
  score: number;
  domainReviews: number;
  validation: string;
  exists: boolean;
};

type LiveReview = {
  id: string;
  agentId: string;
  score: number;
  reviewHash: string;
  summary: string | null;
  anchorTxHash?: string | null;
};

type Detail = {
  paper: Paper;
  council: { id: string; status: string; selectionHash: string } | null;
  selection: Selection[];
  reviews: LiveReview[];
  agents: Array<{ id: string; agentKey: string }>;
};

const INKS = ["var(--ultramarine)", "var(--emerald)", "var(--madder)", "var(--sepia)", "var(--violet)"];
const ROMAN = ["i", "ii", "iii", "iv", "v"];

function shortHash(h: string) {
  return `${h.slice(0, 8)}…${h.slice(-6)}`;
}
function shortAddr(a: string) {
  return `${a.slice(0, 6)}…${a.slice(-4)}`;
}

/** Journey step index: 0 submitted, 1 ranked, 2 signed, 3 council, 4 anchored. */
function journeyStep(d: Detail | null, anchoredCount: number, reviewCount: number): number {
  if (!d) return -1;
  if (anchoredCount >= 5 || (d.council?.status === "completed" && anchoredCount > 0 && anchoredCount >= reviewCount)) return 4;
  if (d.council?.status === "completed" || reviewCount >= 5) return 4;
  if (d.council?.status === "active") return 3;
  if (d.council) return 2;
  return 1;
}

function verdictOf(score: number, recommendation?: string): string {
  if (recommendation) return recommendation.toLowerCase().replace(/_/g, " ");
  if (score >= 8) return "minor revision";
  if (score >= 5) return "major revision";
  return "reject";
}

function recommendationOf(r: LiveReview): string | undefined {
  const s = r.summary ?? "";
  if (!s.includes("FULL_JSON:")) return undefined;
  try {
    const parsed = JSON.parse(s.slice(s.indexOf("FULL_JSON:") + 10)) as { recommendation?: string };
    return parsed.recommendation;
  } catch {
    return undefined;
  }
}

/** Reputation read as a mark scale: ten ticks, filled by score. */
function MarkScale({ score, ink }: { score: number; ink: string }) {
  const filled = Math.round(score * 10);
  return (
    <span aria-label={`reputation ${score.toFixed(2)}`} style={{ display: "inline-flex", gap: 2, alignItems: "center" }}>
      {Array.from({ length: 10 }, (_, i) => (
        <span
          key={i}
          style={{
            width: 3,
            height: i % 5 === 4 ? 12 : 8,
            background: i < filled ? ink : "var(--rule-faint)",
          }}
        />
      ))}
    </span>
  );
}

export default function AppPage() {
  return (
    <Suspense>
      <Journey />
    </Suspense>
  );
}

function Journey() {
  const searchParams = useSearchParams();
  const { address } = useWallet();
  const [papers, setPapers] = useState<Paper[] | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [liveMessages, setLiveMessages] = useState<Array<{ id: string; agentId: string | null; content: string }>>([]);
  const [liveReviews, setLiveReviews] = useState<LiveReview[]>([]);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [arxivUrl, setArxivUrl] = useState("");
  const [err, setErr] = useState<string | null>(null);

  const loadPapers = (select?: string) => {
    fetch("/api/papers", { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => {
        if (!j.ok) throw new Error(j.error?.message ?? "load failed");
        const list = j.data as Paper[];
        setPapers(list);
        if (select) setSelectedId(select);
        else if (!selectedId && list.length) {
          const mine = address ? list.find((p) => p.authorAddress.toLowerCase() === address.toLowerCase()) : undefined;
          setSelectedId((mine ?? list[0]).id);
        }
      })
      .catch((e) => setErr(e.message));
  };

  const loadDetail = (id: string) => {
    fetch(`/api/papers/${id}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => {
        if (!j.ok) return;
        setDetail(j.data as Detail);
      })
      .catch(() => {});
    fetch(`/api/papers/${id}/council/run`, { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => {
        if (!j.ok) return;
        setLiveMessages(j.data.messages ?? []);
        setLiveReviews(j.data.reviews ?? []);
      })
      .catch(() => {});
    fetch(`/api/papers/${id}/anchor`, { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => {
        if (!j.ok || !j.data.reviews) return;
        const anchored = j.data.reviews as LiveReview[];
        setLiveReviews((prev) => {
          const byId = new Map(prev.map((r) => [r.id, r]));
          for (const r of anchored) byId.set(r.id, { ...byId.get(r.id), ...r });
          return Array.from(byId.values());
        });
      })
      .catch(() => {});
  };

  useEffect(() => {
    loadPapers(searchParams.get("paper") ?? undefined);
  }, []);

  useEffect(() => {
    if (selectedId) loadDetail(selectedId);
    else {
      setDetail(null);
      setLiveMessages([]);
      setLiveReviews([]);
    }
  }, [selectedId]);

  const reviewCount = liveReviews.length || (detail?.reviews.length ?? 0);
  const displayedReviews: LiveReview[] = liveReviews.length ? liveReviews : (detail?.reviews ?? []);
  const anchoredCount = displayedReviews.filter((r) => r.anchorTxHash).length;
  const councilActive = detail?.council?.status === "active" && reviewCount < 5;
  const running = busy === "run" || councilActive;
  // Pair reviews to examiners by identity (agents.id → agentKey), never by
  // array position — the review queries carry no ordering guarantee.
  const keyByAgentId = new Map((detail?.agents ?? []).map((a) => [a.id, a.agentKey]));
  const reviewFor = (agentKey: string) =>
    displayedReviews.find((r) => keyByAgentId.get(r.agentId) === agentKey);

  // Poll while the sitting is live (server runs independently; this only refreshes UI).
  useEffect(() => {
    if (!selectedId || !running) return;
    const iv = setInterval(() => loadDetail(selectedId), 2000);
    return () => clearInterval(iv);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, running, reviewCount]);

  // Auto-resume: if a council is active with reports outstanding, kick the
  // server-side run once per paper (single-flight + resumable on server).
  // Covers return-to-console and a background run that died with the process.
  // Deliberately does NOT reset when councilActive flickers — only on paper change.
  const autoRunFor = useRef<string | null>(null);
  useEffect(() => {
    if (!selectedId) {
      autoRunFor.current = null;
      return;
    }
    if (!councilActive) return;
    if (autoRunFor.current === selectedId) return;
    autoRunFor.current = selectedId;
    fetch(`/api/papers/${selectedId}/council/run`, { method: "POST" }).catch(() => {});
  }, [selectedId, councilActive]);

  const submitArxiv = async () => {
    const url = arxivUrl.trim();
    if (!url) { setMsg("Paste an arXiv URL — e.g. https://arxiv.org/abs/1706.03762"); return; }
    if (!url.includes("arxiv.org") && !/^\d{4}\.\d{4,5}/.test(url)) { setMsg("That is not an arXiv URL or ID — try https://arxiv.org/abs/1706.03762"); return; }
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
      setMsg("Submitted — ranking the network for a council…");
      setArxivUrl("");
      try {
        const pr = await fetch(`/api/papers/${j.data.id}/selection`, { method: "POST" });
        const pj = await pr.json();
        if (!pj.ok) throw new Error(pj.error?.message ?? "propose failed");
        setMsg("Submitted and ranked — sign the council to open the sitting.");
      } catch (e) {
        setMsg(`Submitted — auto-ranking failed (${e instanceof Error ? e.message : e}); use Rank the network below.`);
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
      setMsg("Council proposed — sign it to open the sitting.");
      loadDetail(selectedId);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  };

  const sign = async () => {
    if (!selectedId || !detail?.council) return;
    if (!address) { setMsg("Connect your wallet first — Base Sepolia 84532."); return; }
    setBusy("sign");
    setMsg(null);
    try {
      const anyWindow = window as unknown as { ethereum?: { request: (a: unknown) => Promise<string> } };
      if (!anyWindow.ethereum) throw new Error("No injected wallet — install MetaMask or Rabby and switch to Base Sepolia 84532");
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
      setMsg("Signed — the council is open and the sitting has begun. Browse freely; reports arrive on their own.");
      loadDetail(selectedId);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
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
      setMsg(`Anchored ${j.data.anchored.length} reports on Base Sepolia.`);
      loadDetail(selectedId);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  };

  const step = journeyStep(detail, anchoredCount, reviewCount);
  const shoulder = [
    { id: "submitted", label: "submitted" },
    { id: "ranked", label: "ranked" },
    { id: "signed", label: "signed" },
    { id: "council", label: "council" },
    { id: "anchored", label: "anchored" },
  ];
  const hereIndex = !detail ? 0 : step === 4 && anchoredCount >= Math.min(5, Math.max(reviewCount, 1)) ? 4 : step;
  const scores = displayedReviews.map((r) => r.score).sort((a, b) => a - b);
  const median = scores.length ? scores[Math.floor(scores.length / 2)] : null;

  return (
    <main style={{ minHeight: "100dvh", background: "var(--paper)", display: "flex", flexDirection: "column" }}>
      <SiteHeader active="CONSOLE" />

      <div className="section-pad page-measure" style={{ flex: 1, width: "100%" }}>
        <div className="guide-line">
          <span>RAAC · Vol. 84532</span>
          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "46%" }}>
            {detail ? `Entry — ${detail.paper.domain} · ${shortHash(detail.paper.paperHash)}` : "The review lexicon"}
          </span>
          <span>Base Sepolia</span>
        </div>

        <div className="journey-grid" style={{ marginTop: 36 }}>
          {/* Shoulder index — the journey as thumb tabs */}
          <aside className="journey-shoulder" style={{ position: "sticky", top: 82 }}>
            <nav className="shoulder" aria-label="Journey">
              {shoulder.map((s, i) => {
                const state = !detail ? (i === 0 ? "here" : "") : i < hereIndex || (i === 4 && anchoredCount >= 5) ? "done" : i === hereIndex ? "here" : "";
                return (
                  <span key={s.id} className={`shoulder-step ${state}`}>
                    <span className="shoulder-thumb" aria-hidden />
                    {s.label}
                  </span>
                );
              })}
            </nav>
          </aside>

          {/* The entry itself */}
          <div>
            {!detail ? (
              <>
                <h1 style={{ fontSize: "clamp(34px, 4.2vw, 56px)", fontWeight: 700, letterSpacing: "-0.02em", lineHeight: 1.08 }}>
                  Submit a paper, convene a council.
                </h1>
                <p style={{ marginTop: 12, fontStyle: "italic", fontSize: 16.5, color: "var(--ink-soft)", maxWidth: 640 }}>
                  An arXiv preprint in, five examiner reports out — ranked, signed, discussed, and anchored on Base Sepolia.
                </p>
                <Plate caption="Plate i. — Submission" plateNo="fee 0.001 ETH" style={{ marginTop: 26 }}>
                  <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
                    <input
                      value={arxivUrl}
                      onChange={(e) => setArxivUrl(e.target.value)}
                      placeholder="https://arxiv.org/abs/1706.03762"
                      style={{
                        flex: "1 1 300px",
                        minWidth: 220,
                        background: "var(--paper)",
                        border: "1px solid var(--rule-soft)",
                        color: "var(--ink)",
                        padding: "12px 14px",
                        fontSize: 15,
                        outline: "none",
                      }}
                    />
                    <button onClick={submitArxiv} disabled={busy === "submit"} className="btn-action">
                      {busy === "submit" ? "Submitting…" : "Submit arXiv →"}
                    </button>
                  </div>
                  <p className="mono" style={{ marginTop: 10, fontSize: 10, letterSpacing: "0.08em", color: "var(--ink-faint)" }}>
                    {address ? `Author ${shortAddr(address)} · ` : ""}Title, abstract, and domain are fetched from arXiv; the fee is escrowed on 84532.
                  </p>
                </Plate>
                {err && <p style={{ marginTop: 14, color: "var(--madder)" }}>{err}</p>}
                {papers && papers.length > 0 && (
                  <p style={{ marginTop: 22, fontSize: 15 }}>
                    <span style={{ color: "var(--ink-soft)" }}>This volume already holds {papers.length} {papers.length === 1 ? "entry" : "entries"} — </span>
                    <button
                      onClick={() => setSelectedId(papers[0].id)}
                      className="link"
                      style={{ background: "none", border: "none", padding: 0, cursor: "pointer", font: "inherit", color: "var(--vermilion-deep)", textDecoration: "underline", textUnderlineOffset: 3 }}
                    >
                      open the latest
                    </button>
                    .
                  </p>
                )}
              </>
            ) : (
              <>
                <h1 style={{ fontSize: "clamp(28px, 3.4vw, 44px)", fontWeight: 700, letterSpacing: "-0.02em", lineHeight: 1.15, maxWidth: 760 }}>
                  {detail.paper.title}
                </h1>
                <p style={{ marginTop: 10, fontStyle: "italic", fontSize: 15.5, color: "var(--ink-soft)", maxWidth: 700 }}>
                  {detail.paper.domain}. Submitted {new Date(detail.paper.createdAt).toLocaleDateString()} by {shortAddr(detail.paper.authorAddress)}
                  {detail.paper.feeAmountWei ? `; fee ${Number(BigInt(detail.paper.feeAmountWei)) / 1e18} ETH, escrowed` : ""}; hash{" "}
                  <span className="mono" style={{ fontStyle: "normal", fontSize: 12.5 }}>{shortHash(detail.paper.paperHash)}</span>.
                </p>

                {/* The one live action, directly under the entry */}
                <div style={{ marginTop: 20 }}>
                  {!detail.council && (
                    <button onClick={propose} disabled={busy === "propose"} className="btn-action">
                      {busy === "propose" ? "Ranking the network…" : "Rank the network, propose a council →"}
                    </button>
                  )}
                  {detail.council?.status === "proposed" && (
                    <button onClick={sign} disabled={busy === "sign"} className="btn-action">
                      {busy === "sign" ? "Signing…" : address ? `Sign the council as ${shortAddr(address)} →` : "Connect wallet to sign"}
                    </button>
                  )}
                  {detail.council?.status === "active" && reviewCount < 5 && (
                    <span
                      aria-live="polite"
                      className="sc"
                      style={{
                        display: "inline-block",
                        padding: "12px 22px",
                        border: "1.5px solid var(--chrome)",
                        background: "transparent",
                        color: "var(--chrome)",
                        fontSize: 14,
                        fontWeight: 700,
                        letterSpacing: "0.1em",
                        cursor: "default",
                        userSelect: "none",
                        pointerEvents: "none",
                      }}
                    >
                      ● sitting in session — {reviewCount}/5 reports
                    </span>
                  )}
                  {reviewCount >= 5 && anchoredCount < reviewCount && (
                    <button onClick={anchor} disabled={busy === "anchor"} className="btn-action">
                      {busy === "anchor" ? "Anchoring…" : "Anchor the reports on Base Sepolia →"}
                    </button>
                  )}
                  {reviewCount >= 5 && anchoredCount >= reviewCount && (
                    <Link href={`/papers/${detail.paper.id}`} className="btn-action">
                      Read the five reports →
                    </Link>
                  )}
                  {running && (
                    <span className="mono flap-in" style={{ marginLeft: 14, fontSize: 10, letterSpacing: "0.1em", color: "var(--chrome)" }}>
                      ● drafting — {liveMessages.length} exchanges in the margin
                    </span>
                  )}
                  {msg && <p className="mono" style={{ marginTop: 10, fontSize: 10.5, letterSpacing: "0.06em", color: "var(--ink-soft)" }}>{msg}</p>}
                </div>

                {/* Routing */}
                <h2 className="entry-head">
                  <span>Routing</span>
                  <span className="mono" style={{ fontSize: 10, letterSpacing: "0.08em", color: "var(--ink-faint)", fontVariant: "normal" }}>
                    score = 0.5·overall + 0.4·domain + 0.1·recency
                  </span>
                </h2>
                <p style={{ fontSize: 15.5, lineHeight: 1.65, color: "var(--ink-soft)", maxWidth: 680 }}>
                  <b className="sc" style={{ color: "var(--ink)" }}>selection, n.</b> The network, {detail.selection.length > 0 ? `${detail.selection.length} agents` : "every registered agent"}, ranked by reputation on The Graph; the five most qualified are admitted to the council. Failed validation is refused at the gate.
                </p>
                <div style={{ marginTop: 16, display: "grid", gap: 0 }}>
                  {detail.selection.slice(0, 6).map((s, i) => {
                    const refused = s.validation === "failed";
                    return (
                      <div
                        key={s.erc8004}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 14,
                          padding: "10px 0",
                          borderTop: "1px solid var(--rule-faint)",
                          color: refused ? "var(--madder)" : "var(--ink)",
                        }}
                      >
                        <span className="mono" style={{ fontSize: 11, color: refused ? "var(--madder)" : INKS[i] ?? "var(--ink)", width: 18, flexShrink: 0 }}>
                          {ROMAN[i] ?? `${i + 1}`}.
                        </span>
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <span style={{ fontSize: 15.5, fontWeight: 600 }}>
                            {s.name}
                          </span>{" "}
                          <span className="chip">{s.erc8004}</span>
                          {refused && <span className="sc" style={{ marginLeft: 8, fontSize: 12, color: "var(--madder)" }}>— refused at the gate</span>}
                          <div className="mono" style={{ marginTop: 3, fontSize: 9.5, letterSpacing: "0.08em", color: "var(--ink-faint)" }}>
                            {s.domainReviews} domain reviews · {s.exists ? "in this volume" : "external registry"}
                          </div>
                        </div>
                        <MarkScale score={s.score} ink={refused ? "var(--madder)" : INKS[i] ?? "var(--ink)"} />
                        <span className="mono" style={{ fontSize: 13, width: 40, textAlign: "right", color: "var(--ink)" }}>
                          {s.score.toFixed(2)}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Council */}
                <h2 className="entry-head">
                  <span>Council</span>
                  <span className="mono" style={{ fontSize: 10, letterSpacing: "0.08em", color: "var(--ink-faint)", fontVariant: "normal" }}>
                    {detail.council ? `sitting ${detail.council.status}` : "not yet convened"}
                  </span>
                </h2>
                <Plate caption="Plate ii. — The five examiners" plateNo={median !== null ? `median ${median}/10` : "reports pending"}>
                  <div style={{ display: "grid", gap: 0 }}>
                    {detail.selection.slice(0, 5).map((s, i) => {
                      const review = reviewFor(s.agent_key);
                      const ink = INKS[i];
                      return (
                        <div
                          key={s.erc8004}
                          className={review ? "flap-in" : undefined}
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "baseline",
                            gap: 14,
                            padding: "11px 0",
                            borderTop: i === 0 ? "none" : "1px solid var(--rule-faint)",
                          }}
                        >
                          <span style={{ fontSize: 15.5, minWidth: 0 }}>
                            <span className="mono" style={{ fontSize: 11, color: ink, marginRight: 8 }}>{ROMAN[i]}.</span>
                            <b style={{ fontWeight: 600 }}>{s.name}</b>
                            <span style={{ color: "var(--ink-faint)" }}> — </span>
                            <span className="sc" style={{ fontSize: 13, color: "var(--ink-soft)" }}>
                              {review ? "report received" : running ? "at the writing desk…" : "awaiting the sitting"}
                            </span>
                          </span>
                          {review ? (
                            <span className="sc" style={{ fontSize: 14, fontWeight: 700, color: ink, whiteSpace: "nowrap" }}>
                              {review.score} · {verdictOf(review.score, recommendationOf(review))}
                            </span>
                          ) : (
                            <span className="mono" style={{ fontSize: 10, letterSpacing: "0.1em", color: running ? "var(--chrome)" : "var(--ink-faint)", whiteSpace: "nowrap" }}>
                              {running ? "● drafting" : "— — —"}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  {median !== null && (
                    <p style={{ marginTop: 16, paddingTop: 14, borderTop: "1px solid var(--rule-soft)", fontSize: 15.5, color: "var(--ink-soft)" }}>
                      Five reports, discussed then written independently. Median{" "}
                      <span style={{ fontSize: 30, fontWeight: 700, color: "var(--ink)", lineHeight: 1 }}>{median}</span>
                      /10 — {verdictOf(median)}.{" "}
                      <Link href={`/papers/${detail.paper.id}`} style={{ whiteSpace: "nowrap" }}>Read them in full →</Link>
                    </p>
                  )}
                </Plate>

                {/* Marginalia — the discussion */}
                {liveMessages.length > 0 && (
                  <>
                    <h2 className="entry-head"><span>Marginalia</span></h2>
                    <div style={{ display: "grid", gap: 8, maxWidth: 680 }}>
                      {liveMessages.slice(-6).map((m) => (
                        <p key={m.id} style={{ fontSize: 14, fontStyle: "italic", lineHeight: 1.6, color: "var(--ink-soft)", paddingLeft: 16, borderLeft: "1px solid var(--rule-soft)" }}>
                          {m.content}
                        </p>
                      ))}
                    </div>
                  </>
                )}
              </>
            )}
          </div>

          {/* Margin column */}
          <div className="journey-margin" style={{ display: "grid", gap: 24, alignContent: "start" }}>
            <Plate caption="Anchoring plate" plateNo="84532">
              {!detail || displayedReviews.length === 0 ? (
                <p style={{ fontSize: 14, color: "var(--ink-faint)", fontStyle: "italic" }}>
                  No reports to anchor yet — each review’s hash is committed to Base Sepolia once written.
                </p>
              ) : (
                <div style={{ display: "grid", gap: 0 }}>
                  {detail.selection.slice(0, 5).map((s, i) => {
                    const r = reviewFor(s.agent_key);
                    if (!r) return null;
                    return (
                    <div key={r.id} style={{ display: "flex", justifyContent: "space-between", gap: 10, padding: "7px 0", borderTop: i === 0 ? "none" : "1px solid var(--rule-faint)", fontSize: 13.5 }}>
                      <span className="sc" style={{ color: "var(--ink-soft)" }}>report {ROMAN[i]}</span>
                      {r.anchorTxHash ? (
                        <a
                          href={`https://sepolia.basescan.org/tx/${r.anchorTxHash}`}
                          target="_blank"
                          rel="noreferrer"
                          className="mono"
                          style={{ fontSize: 11, color: "var(--emerald)" }}
                        >
                          {r.anchorTxHash.slice(0, 8)}… ✓
                        </a>
                      ) : (
                        <span className="mono" style={{ fontSize: 11, color: "var(--chrome)" }}>queued</span>
                      )}
                    </div>
                  );})}
                </div>
              )}
              <p className="mono" style={{ marginTop: 12, fontSize: 9.5, letterSpacing: "0.08em", color: "var(--ink-faint)" }}>
                paper hash {detail ? shortHash(detail.paper.paperHash) : "—"} · sha256 per report
              </p>
            </Plate>

            <Plate caption="Index of entries" plateNo={papers ? `${papers.length} in vol.` : undefined}>
              {!papers || papers.length === 0 ? (
                <p style={{ fontSize: 14, color: "var(--ink-faint)", fontStyle: "italic" }}>The volume is empty — the first submission opens it.</p>
              ) : (
                <div style={{ display: "grid", gap: 0 }}>
                  {papers.slice(0, 8).map((p) => (
                    <button
                      key={p.id}
                      onClick={() => setSelectedId(p.id)}
                      style={{
                        display: "block",
                        width: "100%",
                        textAlign: "left",
                        background: p.id === selectedId ? "var(--paper-sunk)" : "transparent",
                        border: "none",
                        borderTop: "1px solid var(--rule-faint)",
                        padding: "9px 6px",
                        cursor: "pointer",
                        font: "inherit",
                      }}
                    >
                      <span style={{ fontSize: 14, fontWeight: 600, color: "var(--ink)", display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {p.title}
                      </span>
                      <span className="mono" style={{ fontSize: 9.5, letterSpacing: "0.08em", color: "var(--ink-faint)" }}>
                        {p.domain.toUpperCase()} · {p.status.replace(/_/g, " ").toUpperCase()}
                      </span>
                    </button>
                  ))}
                </div>
              )}
              <div style={{ marginTop: 12 }}>
                {detail ? (
                  <button
                    onClick={() => setSelectedId(null)}
                    className="link sc"
                    style={{ background: "none", border: "none", padding: 0, cursor: "pointer", font: "inherit", fontSize: 13, color: "var(--vermilion-deep)" }}
                  >
                    + submit another entry
                  </button>
                ) : null}
              </div>
            </Plate>
          </div>
        </div>
      </div>

      <SiteFooter />
    </main>
  );
}
