"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Plate from "@/components/Plate";
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
    pdfUrl: string | null;
    createdAt: string;
  };
  council: { id: string; status: string; selectionHash: string } | null;
  selection: Array<{ agent_key: string; name: string; erc8004: string; score: number; domainReviews: number; validation: string; exists: boolean }>;
  reviews: Array<{ id: string; agentId: string; score: number; reviewHash: string; summary: string | null }>;
  agents: Array<{ id: string; agentKey: string }>;
};

type LiveReview = {
  id: string;
  agentId: string;
  score: number;
  reviewHash: string;
  summary: string | null;
  strengths?: string | null;
  weaknesses?: string | null;
  questions?: string | null;
  confidence?: number | null;
  anchorTxHash?: string | null;
};

const INKS = ["var(--ultramarine)", "var(--emerald)", "var(--madder)", "var(--sepia)", "var(--violet)"];
const ROMAN = ["i", "ii", "iii", "iv", "v"];

function shortHash(h: string) {
  return `${h.slice(0, 10)}…${h.slice(-6)}`;
}
function shortAddr(a: string) {
  return `${a.slice(0, 6)}…${a.slice(-4)}`;
}

function verdictOf(score: number, recommendation?: string): string {
  if (recommendation) return recommendation.toLowerCase().replace(/_/g, " ");
  if (score >= 8) return "minor revision";
  if (score >= 5) return "major revision";
  return "reject";
}

function SectionHead({ n, children }: { n: string; children: React.ReactNode }) {
  return (
    <h4 className="sc" style={{ fontSize: 13, color: "var(--ink-faint)", marginTop: 18, marginBottom: 6 }}>
      {n}. {children}
    </h4>
  );
}

export default function PaperEntryPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const [data, setData] = useState<Detail | null>(null);
  const [liveReviews, setLiveReviews] = useState<LiveReview[]>([]);
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
    fetch(`/api/papers/${id}/anchor`, { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => {
        if (j.ok && j.data.reviews) setLiveReviews(j.data.reviews as LiveReview[]);
      })
      .catch(() => {});
  }, [id]);

  if (err) {
    return (
      <main style={{ minHeight: "100dvh", background: "var(--paper)", display: "flex", flexDirection: "column" }}>
        <SiteHeader active="CONSOLE" />
        <div className="section-pad page-measure" style={{ flex: 1, width: "100%" }}>
          <Plate caption="Entry — error">
            <p style={{ color: "var(--madder)" }}>{err}</p>
          </Plate>
          <p style={{ marginTop: 18 }}><Link href="/console" className="link sc" style={{ fontSize: 13 }}>← back to the journey</Link></p>
        </div>
        <SiteFooter />
      </main>
    );
  }

  if (!data) {
    return (
      <main style={{ minHeight: "100dvh", background: "var(--paper)", display: "flex", flexDirection: "column" }}>
        <SiteHeader active="CONSOLE" />
        <div className="section-pad page-measure mono" style={{ flex: 1, width: "100%", fontSize: 11, letterSpacing: "0.12em", color: "var(--ink-faint)" }}>
          Opening the entry…
        </div>
        <SiteFooter />
      </main>
    );
  }

  const { paper, council, selection, reviews } = data;
  const displayed: LiveReview[] = liveReviews.length ? liveReviews : (reviews as LiveReview[]);
  // Pair reviews to examiners by identity (agents.id → agentKey), never by
  // array position — the review queries carry no ordering guarantee.
  const keyByAgentId = new Map((data.agents ?? []).map((a) => [a.id, a.agentKey]));
  const byAgentKey = new Map(displayed.map((r) => [keyByAgentId.get(r.agentId), r]));
  const reportRows = selection
    .slice(0, 5)
    .map((s, i) => ({ agent: s, i, review: byAgentKey.get(s.agent_key) }))
    .filter((row): row is { agent: (typeof selection)[number]; i: number; review: LiveReview } => !!row.review);
  const scores = displayed.map((r) => r.score).sort((a, b) => a - b);
  const median = scores.length ? scores[Math.floor(scores.length / 2)] : null;

  return (
    <main style={{ minHeight: "100dvh", background: "var(--paper)", display: "flex", flexDirection: "column" }}>
      <SiteHeader active="CONSOLE" />

      <div className="section-pad page-measure" style={{ flex: 1, width: "100%" }}>
        <div className="guide-line">
          <span><Link href="/console" className="link" style={{ color: "inherit" }}>← the journey</Link></span>
          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "46%" }}>
            Entry — {paper.domain} · {shortHash(paper.paperHash)}
          </span>
          <span>RAAC · Vol. 84532</span>
        </div>

        <div className="journey-grid" style={{ marginTop: 36, gridTemplateColumns: "minmax(0, 1fr) 320px" }}>
          <div>
            <h1 style={{ fontSize: "clamp(28px, 3.4vw, 44px)", fontWeight: 700, letterSpacing: "-0.02em", lineHeight: 1.15, maxWidth: 780 }}>
              {paper.title}
            </h1>
            <p style={{ marginTop: 10, fontStyle: "italic", fontSize: 15.5, color: "var(--ink-soft)", maxWidth: 720 }}>
              {paper.domain}. Submitted {new Date(paper.createdAt).toLocaleDateString()} by {shortAddr(paper.authorAddress)}
              {paper.feeAmountWei ? `; fee ${Number(BigInt(paper.feeAmountWei)) / 1e18} ETH, escrowed` : ""}.{" "}
              {paper.pdfUrl && <a href={paper.pdfUrl} target="_blank" rel="noreferrer">arXiv source ↗</a>}
            </p>
            <p style={{ marginTop: 16, fontSize: 15, lineHeight: 1.7, color: "var(--ink-soft)", maxWidth: 720 }}>{paper.abstract}</p>
            <div style={{ marginTop: 14, display: "flex", gap: 8, flexWrap: "wrap" }}>
              <span className="chip">{paper.status.replace(/_/g, " ")}</span>
              <span className="chip">hash {shortHash(paper.paperHash)}</span>
              {paper.keywords.slice(0, 4).map((k) => <span key={k} className="chip">{k}</span>)}
            </div>

            {displayed.length === 0 ? (
              <>
                <h2 className="entry-head"><span>The five reports</span></h2>
                <Plate caption="Plate i. — Reports" plateNo="pending">
                  <p style={{ fontSize: 15, fontStyle: "italic", color: "var(--ink-faint)" }}>
                    {council
                      ? "The council has not yet written — convene it from the journey page."
                      : "No council sits on this entry yet — begin the journey to rank one."}
                  </p>
                  <p style={{ marginTop: 14 }}>
                    <Link href={`/console?paper=${paper.id}`} className="btn-action">Continue the journey →</Link>
                  </p>
                </Plate>
              </>
            ) : (
              <>
                <h2 className="entry-head">
                  <span>The five reports</span>
                  {median !== null && (
                    <span style={{ fontVariant: "normal", fontSize: 14, color: "var(--ink-soft)" }}>
                      median <b style={{ fontSize: 20, color: "var(--ink)" }}>{median}</b>/10 — {verdictOf(median)}
                    </span>
                  )}
                </h2>

                <div style={{ display: "grid", gap: 28 }}>
                  {reportRows.map(({ agent, i, review: r }) => {
                    const ink = INKS[i] ?? "var(--ink)";
                    const raw = r.summary ?? "";
                    const isLive = raw.includes("FULL_JSON:");
                    let parsed: Record<string, unknown> | null = null;
                    let manuscript = "";
                    let overall = "";
                    if (isLive) {
                      const idx = raw.indexOf("FULL_JSON:");
                      const head = raw.slice(0, idx).trim();
                      const parts = head.split("\n\n");
                      manuscript = parts[0] ?? "";
                      overall = parts[1] ?? "";
                      try { parsed = JSON.parse(raw.slice(idx + 10)) as Record<string, unknown>; } catch { parsed = null; }
                    }
                    const major = parsed?.major_issues as Array<Record<string, string>> | undefined;
                    const minor = parsed?.minor_issues as string[] | undefined;
                    const strengthsArr = parsed?.strengths as string[] | undefined;
                    const questionsArr = parsed?.questions as string[] | undefined;
                    const recommendation = parsed?.recommendation as string | undefined;
                    const confidenceLabel = parsed?.confidence as string | undefined;
                    const justification = parsed?.justification as string | undefined;

                    return (
                      <Plate
                        key={r.id}
                        caption={`Report ${ROMAN[i]}. — ${agent?.name ?? r.agentId}`}
                        plateNo={`${r.score}/10 · ${verdictOf(r.score, recommendation)}`}
                      >
                        <div style={{ borderLeft: `2px solid ${ink}`, paddingLeft: 16 }}>
                          <div className="mono" style={{ fontSize: 9.5, letterSpacing: "0.08em", color: "var(--ink-faint)" }}>
                            {agent && <span>{agent.erc8004} · </span>}hash {shortHash(r.reviewHash)}
                            {r.anchorTxHash && (
                              <a href={`https://sepolia.basescan.org/tx/${r.anchorTxHash}`} target="_blank" rel="noreferrer" style={{ color: "var(--emerald)" }}>
                                {" "}· anchored {r.anchorTxHash.slice(0, 8)}… ✓
                              </a>
                            )}
                          </div>

                          {!isLive ? (
                            <>
                              <p style={{ marginTop: 12, fontSize: 15, lineHeight: 1.7, color: "var(--ink-soft)" }}>{raw || "—"}</p>
                              {r.strengths && <p style={{ marginTop: 10, fontSize: 14, lineHeight: 1.65, color: "var(--ink-soft)" }}><b className="sc" style={{ fontSize: 12.5, color: "var(--emerald)" }}>Strengths — </b>{r.strengths}</p>}
                              {r.weaknesses && <p style={{ marginTop: 8, fontSize: 14, lineHeight: 1.65, color: "var(--ink-soft)" }}><b className="sc" style={{ fontSize: 12.5, color: "var(--madder)" }}>Weaknesses — </b>{r.weaknesses}</p>}
                              <p className="mono" style={{ marginTop: 12, fontSize: 9.5, letterSpacing: "0.06em", color: "var(--chrome)", borderTop: "1px dashed var(--rule-soft)", paddingTop: 10 }}>
                                Abbreviated report — the examiner’s model was rate-limited at writing time; the full seven-part report appears when the sitting completes uninterrupted.
                              </p>
                            </>
                          ) : (
                            <>
                              <SectionHead n="1">Manuscript summary</SectionHead>
                              <p style={{ fontSize: 15, lineHeight: 1.7, color: "var(--ink)" }}>{manuscript || (parsed?.manuscript_summary as string) || "—"}</p>

                              <SectionHead n="2">Overall assessment</SectionHead>
                              <p style={{ fontSize: 15, lineHeight: 1.7, color: "var(--ink-soft)" }}>{overall || (parsed?.overall_assessment as string) || "—"}</p>
                              {recommendation && (
                                <p className="sc" style={{ marginTop: 8, fontSize: 14, fontWeight: 700, color: ink }}>
                                  → {recommendation.toLowerCase().replace(/_/g, " ")} · confidence {confidenceLabel ?? r.confidence ?? "—"}
                                </p>
                              )}

                              {major && major.length > 0 && (
                                <>
                                  <SectionHead n="3">Major issues — {major.length}</SectionHead>
                                  <div style={{ display: "grid", gap: 12 }}>
                                    {major.map((it, idx) => (
                                      <div key={idx} style={{ border: "1px solid var(--rule-soft)", padding: "12px 14px", background: "var(--paper)" }}>
                                        <div className="sc" style={{ fontSize: 13, fontWeight: 700, color: "var(--ink)" }}>{idx + 1}. {(it.category ?? "issue").toLowerCase()}</div>
                                        <p style={{ marginTop: 6, fontSize: 14, lineHeight: 1.65, color: "var(--ink-soft)" }}><b className="sc" style={{ fontSize: 12, color: "var(--ink-faint)" }}>Claim — </b>{it.claim || "—"}</p>
                                        <p style={{ fontSize: 14, lineHeight: 1.65, color: "var(--ink-soft)" }}><b className="sc" style={{ fontSize: 12, color: "var(--ink-faint)" }}>Evidence — </b>{it.evidence || "—"}</p>
                                        <p style={{ fontSize: 14, lineHeight: 1.65, color: "var(--madder)" }}><b className="sc" style={{ fontSize: 12, color: "var(--ink-faint)" }}>Gap — </b>{it.gap || "—"}</p>
                                        <p style={{ fontSize: 14, lineHeight: 1.65, color: "var(--emerald)" }}><b className="sc" style={{ fontSize: 12, color: "var(--ink-faint)" }}>Required — </b>{it.required_action || "—"}</p>
                                      </div>
                                    ))}
                                  </div>
                                </>
                              )}

                              {minor && minor.length > 0 && (
                                <>
                                  <SectionHead n="4">Minor issues</SectionHead>
                                  <ul style={{ paddingLeft: 20, fontSize: 14, lineHeight: 1.7, color: "var(--ink-soft)" }}>{minor.map((m, mi) => <li key={mi}>{m}</li>)}</ul>
                                </>
                              )}

                              <SectionHead n="5">Strengths</SectionHead>
                              <ul style={{ paddingLeft: 20, fontSize: 14, lineHeight: 1.7, color: "var(--ink-soft)" }}>{(strengthsArr ?? (r.strengths ? [r.strengths] : [])).map((s, si) => <li key={si}>{s}</li>)}</ul>

                              {questionsArr && questionsArr.length > 0 && (
                                <>
                                  <SectionHead n="6">Questions to the author</SectionHead>
                                  <ul style={{ paddingLeft: 20, fontSize: 14, lineHeight: 1.7, color: "var(--ink-soft)" }}>{questionsArr.map((q, qi) => <li key={qi}>{q}</li>)}</ul>
                                </>
                              )}

                              {justification && (
                                <>
                                  <SectionHead n="7">Justification</SectionHead>
                                  <p style={{ fontSize: 14, lineHeight: 1.7, color: "var(--ink-soft)", fontStyle: "italic" }}>{justification}</p>
                                </>
                              )}
                            </>
                          )}
                        </div>
                      </Plate>
                    );
                  })}
                </div>
              </>
            )}
          </div>

          {/* Margin */}
          <div className="journey-margin" style={{ display: "grid", gap: 24, alignContent: "start" }}>
            <Plate caption="Anchoring plate" plateNo="84532">
              {reportRows.length === 0 ? (
                <p style={{ fontSize: 14, color: "var(--ink-faint)", fontStyle: "italic" }}>Nothing anchored yet.</p>
              ) : (
                <div style={{ display: "grid", gap: 0 }}>
                  {reportRows.map(({ i, review: r }) => (
                    <div key={r.id} style={{ display: "flex", justifyContent: "space-between", gap: 10, padding: "7px 0", borderTop: i === 0 ? "none" : "1px solid var(--rule-faint)", fontSize: 13.5 }}>
                      <span className="sc" style={{ color: "var(--ink-soft)" }}>report {ROMAN[i]}</span>
                      {r.anchorTxHash ? (
                        <a href={`https://sepolia.basescan.org/tx/${r.anchorTxHash}`} target="_blank" rel="noreferrer" className="mono" style={{ fontSize: 11, color: "var(--emerald)" }}>
                          {r.anchorTxHash.slice(0, 8)}… ✓
                        </a>
                      ) : (
                        <span className="mono" style={{ fontSize: 11, color: "var(--chrome)" }}>queued</span>
                      )}
                    </div>
                  ))}
                </div>
              )}
              <p className="mono" style={{ marginTop: 12, fontSize: 9.5, letterSpacing: "0.08em", color: "var(--ink-faint)" }}>
                council {council ? council.status : "—"} · selection {council ? shortHash(council.selectionHash) : "—"}
              </p>
            </Plate>

            <Plate caption="The examiners" plateNo="by reputation">
              <div style={{ display: "grid", gap: 0 }}>
                {selection.slice(0, 5).map((s, i) => (
                  <div key={s.erc8004} style={{ padding: "8px 0", borderTop: i === 0 ? "none" : "1px solid var(--rule-faint)" }}>
                    <span style={{ fontSize: 14, fontWeight: 600 }}>{s.name}</span>
                    <div className="mono" style={{ marginTop: 2, fontSize: 9.5, letterSpacing: "0.08em", color: INKS[i] ?? "var(--ink-faint)" }}>
                      {ROMAN[i]}. · reputation {s.score.toFixed(2)} · {s.domainReviews} domain reviews
                    </div>
                  </div>
                ))}
              </div>
            </Plate>
          </div>
        </div>
      </div>

      <SiteFooter />
    </main>
  );
}
