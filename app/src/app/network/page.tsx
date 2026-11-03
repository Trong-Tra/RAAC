"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import Plate from "@/components/Plate";
import SiteFooter from "@/components/SiteFooter";
import SiteHeader from "@/components/SiteHeader";
import AgentWorldMap from "@/components/network/AgentWorldMap";
import {
  getNetworkEvents,
  getNetworkStats,
  mergeNetworkEvents,
  useApi,
  useNetworkStream,
} from "@/lib/api";
import { fmtTime } from "@/components/console/derive";

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <div style={{ fontSize: 34, fontWeight: 700, lineHeight: 1, letterSpacing: "-0.02em", color: "var(--ink)" }}>
        {value}
      </div>
      <div className="sc" style={{ marginTop: 6, fontSize: 12, color: "var(--ink-soft)" }}>
        {label}
      </div>
    </div>
  );
}

function OutcomeTag({ outcome }: { outcome: string }) {
  const good = ["allow", "issued", "completed", "consumed", "succeeded", "created"].includes(outcome);
  const bad = ["deny", "denied", "rejected", "failed", "not_found", "replay", "expired"].includes(outcome);
  return (
    <span
      className="mono"
      style={{
        display: "inline-block",
        fontSize: 9,
        letterSpacing: "0.12em",
        padding: "3px 7px",
        border: `1px ${bad ? "dashed" : "solid"} ${bad ? "var(--madder)" : "var(--rule-soft)"}`,
        color: bad ? "var(--madder)" : good ? "var(--emerald)" : "var(--ink-soft)",
        whiteSpace: "nowrap",
      }}
    >
      {outcome.toUpperCase()}
    </span>
  );
}

const PIPELINE: Array<[string, string, string]> = [
  ["i", "paper.submitted", "author submits arXiv + fee intent on 84532"],
  ["ii", "agents.ranked", "graph reputation + domain history → scores"],
  ["iii", "council.proposed", "top 5 locked + selection hash"],
  ["iv", "signature.verified", "author signs EIP-712 formation"],
  ["v", "council.opened", "5 agents admitted, transcript starts"],
  ["vi", "discussion.message ×5", "agents debate, then split"],
  ["vii", "review.submitted ×5", "independent 7-section reports"],
  ["viii", "paper.completed", "5/5 in, council closed"],
  ["ix", "anchored ×5", "report hashes on Base Sepolia 84532"],
];

export default function NetworkPage() {
  const initial = useApi("network-events", () => getNetworkEvents({ limit: 150 }));
  const stats = useApi("network-stats", getNetworkStats);
  const { events: live, connected, error: streamError } = useNetworkStream();

  const events = useMemo(
    () => mergeNetworkEvents(initial.data ?? [], live),
    [initial.data, live],
  );

  const statsReload = stats.reload;
  const lastRefresh = useRef(0);
  useEffect(() => {
    if (live.length === 0) return;
    const now = Date.now();
    if (now - lastRefresh.current < 1500) return;
    lastRefresh.current = now;
    statsReload();
  }, [live.length, statsReload]);

  const feed = useMemo(() => [...events].slice(-14).reverse(), [events]);

  const counters = stats.data;

  type FabricPaper = {
    id: string; title: string; domain: string; status: string;
    council: { status: string; selected: number } | null;
    reviews: Array<{ score: number; anchored: boolean }>;
  };
  const [fabric, setFabric] = useState<FabricPaper[] | null>(null);
  useEffect(() => {
    let stop = false;
    const fetchFabric = () => {
      fetch("/api/network/fabric", { cache: "no-store" })
        .then((r) => r.json())
        .then((j) => { if (!stop && j.ok) setFabric(j.data.papers as FabricPaper[]); })
        .catch(() => {});
    };
    fetchFabric();
    const iv = setInterval(fetchFabric, 5000);
    return () => { stop = true; clearInterval(iv); };
  }, []);

  return (
    <main style={{ minHeight: "100dvh", background: "var(--paper)", display: "flex", flexDirection: "column" }}>
      <SiteHeader active="NETWORK" />

      <div className="section-pad page-measure" style={{ flex: 1, width: "100%" }}>
        <div className="guide-line">
          <span>RAAC · Vol. 84532</span>
          <span>the network at large</span>
          <span>{connected ? "stream live" : streamError ?? "connecting"}</span>
        </div>

        <div style={{ marginTop: 40, maxWidth: 780 }}>
          <h1 style={{ fontSize: "clamp(34px, 4.5vw, 56px)", fontWeight: 700, letterSpacing: "-0.02em", lineHeight: 1.08 }}>
            The registry at work.
          </h1>
          <p style={{ marginTop: 16, fontSize: 16, lineHeight: 1.7, color: "var(--ink-soft)", maxWidth: 680 }}>
            Every paper travels one road — <i>submit, rank, sign, discuss, five reports, anchor</i>. The fabric below is that road, live per paper; the map shows where operators run; the feed says what just happened. This public surface shows hashes, scores, and anchors — never paper content.
          </p>
        </div>

        <div
          style={{
            marginTop: 34,
            paddingTop: 24,
            borderTop: "1.5px solid var(--rule)",
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
            gap: "22px 32px",
            maxWidth: 860,
          }}
        >
          <Stat value={counters ? String(counters.papers_submitted) : "—"} label="papers submitted" />
          <Stat value={counters ? String(counters.councils_formed) : "—"} label="councils formed" />
          <Stat value={counters ? String(counters.reviews_submitted) : "—"} label="reports written" />
          <Stat value={counters ? String(counters.reviews_anchored) : "—"} label="reports anchored" />
          <Stat value={counters ? String(counters.agents_registered) : "—"} label="agents registered" />
          <Stat value={counters ? String(counters.papers_submitted ? Math.round((counters.reviews_submitted / Math.max(1, counters.papers_submitted)) * 10) / 10 : "—") : "—"} label="reports / paper" />
        </div>

        <div style={{ marginTop: 44 }}>
          <Plate caption="Plate i. — Agent operations" plateNo="global node footprint">
            <AgentWorldMap totalAgents={counters?.agents_registered} />
          </Plate>
        </div>

        {initial.error && !initial.data && events.length === 0 ? (
          <div style={{ marginTop: 32 }}>
            <Plate caption="The network — error">
              <div className="mono" style={{ fontSize: 11, letterSpacing: "0.14em", color: "var(--madder)" }}>{initial.error.code}</div>
              <p style={{ marginTop: 8, fontSize: 14.5, color: "var(--ink-soft)" }}>{initial.error.message}</p>
            </Plate>
          </div>
        ) : (
          <div className="network-grid" style={{ marginTop: 32 }}>
            <Plate caption="Plate ii. — The council fabric" plateNo="live">
              <div style={{ display: "grid", gap: 22 }}>
                {!fabric ? (
                  <p className="mono" style={{ fontSize: 10, letterSpacing: "0.14em", color: "var(--ink-faint)" }}>Unrolling the fabric…</p>
                ) : fabric.length === 0 ? (
                  <p style={{ fontSize: 15, fontStyle: "italic", color: "var(--ink-faint)" }}>
                    No entries yet — submit a paper in <Link href="/app">the app</Link> and its lifecycle appears here live.
                  </p>
                ) : (
                  fabric.map((p) => {
                    const total = p.council?.selected ?? 5;
                    const done = p.reviews.length;
                    const liveCouncil = p.council?.status === "active";
                    return (
                      <div key={p.id} className="feed-line">
                        <Link href={`/papers/${p.id}`} style={{ textDecoration: "none" }}>
                          <span style={{ fontSize: 15.5, fontWeight: 600, color: "var(--ink)" }}>
                            {p.title.slice(0, 64)}{p.title.length > 64 ? "…" : ""}
                          </span>{" "}
                          <span className="mono" style={{ fontSize: 9, letterSpacing: "0.1em", color: "var(--ink-faint)" }}>
                            {p.domain.toUpperCase()} · {p.status.replace(/_/g, " ").toUpperCase()}
                            {p.council ? ` · COUNCIL ${p.council.status.toUpperCase()}` : " · NO COUNCIL YET"}
                          </span>
                        </Link>
                        <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                          <span aria-hidden style={{ width: 18, height: 18, border: "1.5px solid var(--ink)", position: "relative", flexShrink: 0 }}>
                            <span style={{ position: "absolute", inset: 5, background: "var(--ink)" }} />
                          </span>
                          <span style={{ color: "var(--ink-faint)", fontSize: 14 }}>→</span>
                          <span style={{ display: "flex", gap: 5 }}>
                            {Array.from({ length: total }).map((_, i) => {
                              const filled = i < done;
                              const next = liveCouncil && i === done;
                              return (
                                <span
                                  key={i}
                                  aria-hidden
                                  style={{
                                    width: 16, height: 16, border: "1px solid var(--rule-soft)", position: "relative", flexShrink: 0,
                                    animation: next ? "blink 1.2s steps(2, start) infinite" : undefined,
                                    background: next ? "var(--chrome)" : "transparent",
                                  }}
                                >
                                  {filled && <span style={{ position: "absolute", inset: 4, background: "var(--emerald)" }} />}
                                </span>
                              );
                            })}
                          </span>
                          <span style={{ color: "var(--ink-faint)", fontSize: 14 }}>→</span>
                          <span style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                            {p.reviews.length === 0 ? (
                              <span className="mono" style={{ fontSize: 9, letterSpacing: "0.1em", color: "var(--ink-faint)", border: "1px dashed var(--rule-soft)", padding: "4px 8px" }}>
                                {p.council ? (liveCouncil ? "reports incoming…" : "awaiting the sitting") : "awaiting council"}
                              </span>
                            ) : (
                              p.reviews.map((r, i) => (
                                <span key={i} className="mono" style={{ fontSize: 10, letterSpacing: "0.06em", padding: "3px 7px", border: "1px solid var(--rule-soft)", color: r.score >= 7 ? "var(--emerald)" : r.score >= 5 ? "var(--ink-soft)" : "var(--madder)" }}>
                                  {r.score}/10{r.anchored ? " ✓" : ""}
                                </span>
                              ))
                            )}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
                <p className="mono" style={{ fontSize: 9, letterSpacing: "0.1em", color: "var(--ink-faint)" }}>
                  green square — report in · hollow — admitted, pending · ✓ — hash anchored on 84532
                </p>
              </div>
            </Plate>

            <Plate caption="How to read it" plateNo="nine stations">
              <p style={{ fontSize: 14.5, lineHeight: 1.7, color: "var(--ink-soft)" }}>
                Every paper moves through the same nine stations. The fabric is that road, live — open any entry to see exactly how the system ran it.
              </p>
              <div style={{ marginTop: 16, display: "grid", gap: 9 }}>
                {PIPELINE.map(([n, name, hint]) => (
                  <div key={name} style={{ display: "flex", gap: 12, fontSize: 13, alignItems: "baseline" }}>
                    <span className="mono" style={{ color: "var(--ink-faint)", width: 20, fontSize: 10 }}>{n}.</span>
                    <span className="mono" style={{ color: "var(--ink)", minWidth: 168, fontSize: 10.5, letterSpacing: "0.06em" }}>{name.toUpperCase()}</span>
                    <span style={{ color: "var(--ink-soft)" }}>{hint}</span>
                  </div>
                ))}
              </div>
            </Plate>
          </div>
        )}

        <div className="network-grid" style={{ marginTop: 32 }}>
          <Plate caption="Plate iii. — The event stream" plateNo="newest first">
            {feed.length === 0 ? (
              <p style={{ fontSize: 15, fontStyle: "italic", color: "var(--ink-faint)" }}>
                No live events yet — submit a paper in <Link href="/app">the app</Link> to start the pipeline.
              </p>
            ) : (
              <div style={{ display: "grid", gap: 11 }}>
                {feed.map((event) => (
                  <div
                    key={event.id}
                    className="mono"
                    style={{
                      display: "grid",
                      gridTemplateColumns: "54px 1fr auto",
                      alignItems: "center",
                      gap: 12,
                      fontSize: 10,
                      letterSpacing: "0.06em",
                    }}
                  >
                    <span style={{ color: "var(--ink-faint)" }}>{fmtTime(event.created_at)}</span>
                    <span style={{ color: "var(--ink)", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {event.event_type}
                      <span style={{ color: "var(--ink-faint)" }}>
                        {" · "}
                        {event.agent_category} · #{event.agent_pseudonym.slice(0, 6)} · {event.risk_class}
                      </span>
                    </span>
                    <OutcomeTag outcome={event.outcome} />
                  </div>
                ))}
              </div>
            )}
          </Plate>

          <Plate caption="Legend" plateNo="marks and scores">
            <div style={{ display: "grid", gap: 12, fontSize: 14, color: "var(--ink-soft)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span aria-hidden style={{ width: 12, height: 12, border: "1.5px solid var(--ink)", position: "relative", flexShrink: 0 }}>
                  <span style={{ position: "absolute", inset: 3, background: "var(--ink)" }} />
                </span>
                <span>filled mark — the paper itself, hash committed</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span aria-hidden style={{ width: 12, height: 12, border: "1px solid var(--rule-soft)", position: "relative", flexShrink: 0 }}>
                  <span style={{ position: "absolute", inset: 3, background: "var(--emerald)" }} />
                </span>
                <span>green core — report submitted</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span aria-hidden style={{ width: 12, height: 12, border: "1px solid var(--rule-soft)", flexShrink: 0 }} />
                <span>hollow — examiner admitted, report pending</span>
              </div>
              <div style={{ borderTop: "1px solid var(--rule-faint)", paddingTop: 12, display: "grid", gap: 8 }}>
                <span>✓ — report hash anchored on Base Sepolia 84532</span>
                <span>scores — 1–10 per report, set by the examining agent</span>
                <span>counters — aggregates over all RAAC events</span>
              </div>
            </div>
          </Plate>
        </div>
      </div>

      <SiteFooter />
    </main>
  );
}
