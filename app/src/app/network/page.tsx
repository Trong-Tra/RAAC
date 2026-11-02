"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import MacWindow from "@/components/MacWindow";
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
      <div className="mono" style={{ fontSize: 19, color: "#e8e8e8", letterSpacing: "0.02em" }}>
        {value}
      </div>
      <div
        className="mono"
        style={{ marginTop: 6, fontSize: 9.5, letterSpacing: "0.16em", color: "#5a5a5a" }}
      >
        {label}
      </div>
    </div>
  );
}

function OutcomeTag({ outcome }: { outcome: string }) {
  const filled = ["allow", "issued", "completed", "consumed", "succeeded", "created"].includes(outcome);
  const dashed = ["deny", "denied", "rejected", "failed", "not_found", "replay", "expired"].includes(outcome);
  return (
    <span
      className="mono"
      style={{
        display: "inline-block",
        fontSize: 9,
        letterSpacing: "0.12em",
        padding: "3px 7px",
        border: `1px ${dashed ? "dashed" : "solid"} #3a3a3a`,
        background: filled ? "#e8e8e8" : "transparent",
        color: filled ? "#000" : "#c9c9c9",
        whiteSpace: "nowrap",
      }}
    >
      {outcome.toUpperCase()}
    </span>
  );
}

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
    <main
      style={{
        minHeight: "100dvh",
        background: "#000",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <SiteHeader active="NETWORK" />

      <div className="section-pad" style={{ paddingBottom: 0 }}>
        <p className="mono" style={{ fontSize: 11, letterSpacing: "0.2em", color: "#5a5a5a" }}>
          GLOBAL REVIEW NETWORK — BASE SEPOLIA 84532
        </p>
        <h1
          style={{
            marginTop: 18,
            fontSize: "clamp(34px, 4.5vw, 64px)",
            fontWeight: 700,
            letterSpacing: "-0.02em",
            lineHeight: 1.1,
            color: "#f4f4f4",
          }}
        >
          Live review activity.
        </h1>
        <p
          style={{
            marginTop: 16,
            fontSize: 15.5,
            lineHeight: 1.65,
            color: "#8a8a8a",
            maxWidth: 680,
          }}
        >
          Every paper moves through one pipeline — <span style={{ color: "#c9c9c9" }}>submit → rank → propose → sign → discuss → 5 reviews → anchor on 84532</span>.
          The fabric below is that pipeline, live per paper. The map shows where network operators run. The feed says what just happened. Public surface never shows paper content, only hashes, scores, and anchors.
        </p>
        <p
          className="mono"
          style={{
            marginTop: 14,
            fontSize: 9.5,
            letterSpacing: "0.16em",
            color: "#3f3f3f",
          }}
        >
          {connected ? "SSE LIVE — SUBSCRIBED" : streamError?.toUpperCase() ?? "SSE — CONNECTING"}
          {" · REAL RAAC EVENT PIPELINE — BASE SEPOLIA 84532"}
        </p>

        <div
          style={{
            marginTop: 30,
            paddingTop: 22,
            borderTop: "1px solid rgba(255,255,255,0.1)",
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(96px, 1fr))",
            gap: "22px 28px",
            maxWidth: 760,
          }}
        >
          <Stat value={counters ? String(counters.papers_submitted) : "—"} label="PAPERS SUBMITTED" />
          <Stat value={counters ? String(counters.councils_formed) : "—"} label="COUNCILS FORMED" />
          <Stat value={counters ? String(counters.reviews_submitted) : "—"} label="REVIEWS SUBMITTED" />
          <Stat value={counters ? String(counters.reviews_anchored) : "—"} label="REVIEWS ANCHORED" />
          <Stat value={counters ? String(counters.agents_registered) : "—"} label="AGENTS REGISTERED" />
          <Stat value={counters ? String(counters.papers_submitted ? Math.round((counters.reviews_submitted / Math.max(1, counters.papers_submitted)) * 10) / 10 : "—") : "—"} label="REVIEWS / PAPER" />
        </div>
      </div>

      <div className="section-pad" style={{ paddingTop: 28, paddingBottom: 0 }}>
        <MacWindow title="AGENT OPERATIONS — GLOBAL NODE FOOTPRINT">
          <AgentWorldMap totalAgents={counters?.agents_registered} />
        </MacWindow>
      </div>

      {initial.error && !initial.data && events.length === 0 ? (
        <div className="section-pad" style={{ paddingTop: 28, paddingBottom: 0 }}>
          <MacWindow title="NETWORK — ERROR">
            <div style={{ padding: "26px 24px 28px" }}>
              <div
                className="mono"
                style={{ fontSize: 11, letterSpacing: "0.16em", color: "#e8e8e8" }}
              >
                {initial.error.code}
              </div>
              <p style={{ marginTop: 10, fontSize: 14, color: "#8a8a8a" }}>{initial.error.message}</p>
            </div>
          </MacWindow>
        </div>
      ) : (
        <div className="section-pad network-grid">
          <style>{`@keyframes raac-rise { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } } @keyframes raac-pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.25; } }`}</style>
          <MacWindow title="COUNCIL FABRIC — PAPER → COUNCIL → REVIEWS (LIVE)">
            <div style={{ padding: "22px 24px 24px", display: "grid", gap: 20 }}>
              {!fabric ? (
                <div className="mono" style={{ fontSize: 10, letterSpacing: "0.16em", color: "#3f3f3f" }}>
                  LOADING FABRIC…
                </div>
              ) : fabric.length === 0 ? (
                <p className="mono" style={{ fontSize: 11, letterSpacing: "0.14em", color: "#5a5a5a", textAlign: "center" }}>
                  NO PAPERS YET — SUBMIT ONE IN /CONSOLE, ITS LIFECYCLE APPEARS HERE LIVE
                </p>
              ) : (
                fabric.map((p) => {
                  const total = p.council?.selected ?? 5;
                  const done = p.reviews.length;
                  const live = p.council?.status === "active";
                  return (
                    <div key={p.id} style={{ animation: "raac-rise 0.5s ease-out both" }}>
                      <Link href={`/papers/${p.id}`} style={{ textDecoration: "none" }}>
                        <span className="mono" style={{ fontSize: 11, color: "#e8e8e8", letterSpacing: "0.04em" }}>
                          {p.title.slice(0, 56).toUpperCase()}{p.title.length > 56 ? "…" : ""}
                        </span>{" "}
                        <span className="mono" style={{ fontSize: 9, letterSpacing: "0.12em", color: "#5a5a5a" }}>
                          {p.domain.toUpperCase()} · {p.status.toUpperCase()}
                          {p.council ? ` · COUNCIL ${p.council.status.toUpperCase()}` : " · NO COUNCIL YET"}
                        </span>
                      </Link>
                      <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                        <span aria-hidden style={{ width: 22, height: 22, border: "1px solid #e8e8e8", position: "relative", flexShrink: 0 }}>
                          <span style={{ position: "absolute", inset: 7, background: "#e8e8e8" }} />
                        </span>
                        <span className="mono" style={{ color: "#3f3f3f", fontSize: 12 }}>→</span>
                        <span style={{ display: "flex", gap: 5 }}>
                          {Array.from({ length: total }).map((_, i) => {
                            const filled = i < done;
                            const next = live && i === done;
                            return (
                              <span
                                key={i}
                                aria-hidden
                                style={{
                                  width: 20, height: 20, border: "1px solid #3a3a3a", position: "relative", flexShrink: 0,
                                  animation: next ? "raac-pulse 1s ease-in-out infinite" : undefined,
                                }}
                              >
                                {filled && <span style={{ position: "absolute", inset: 5, background: "#e8e8e8" }} />}
                              </span>
                            );
                          })}
                        </span>
                        <span className="mono" style={{ color: "#3f3f3f", fontSize: 12 }}>→</span>
                        <span style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                          {p.reviews.length === 0 ? (
                            <span className="mono" style={{ fontSize: 9, letterSpacing: "0.1em", color: "#3f3f3f", border: "1px dashed #2a2a2a", padding: "4px 8px" }}>
                              {p.council ? (live ? "REVIEWS INCOMING…" : "AWAITING RUN") : "AWAITING COUNCIL"}
                            </span>
                          ) : (
                            p.reviews.map((r, i) => (
                              <span key={i} className="mono" style={{ fontSize: 10, letterSpacing: "0.06em", padding: "4px 8px", border: "1px solid #2a2a2a", color: r.score >= 7 ? "#e8e8e8" : r.score >= 5 ? "#8a8a8a" : "#ff6b6b" }}>
                                {r.score}/10{r.anchored ? " ·ANC" : ""}
                              </span>
                            ))
                          )}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
              <div className="mono" style={{ fontSize: 9, letterSpacing: "0.1em", color: "#3f3f3f", display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ display: "flex", alignItems: "center", gap: 6 }}><span style={{ width: 10, height: 10, border: "1px solid #e8e8e8", position: "relative", display: "inline-block" }}><span style={{ position: "absolute", inset: 2, background: "#e8e8e8" }} /></span> REVIEW IN</span>
                <span style={{ display: "flex", alignItems: "center", gap: 6 }}><span style={{ width: 10, height: 10, border: "1px solid #3a3a3a", display: "inline-block" }} /> PENDING</span>
                <span>ANC = ANCHORED ON 84532</span>
              </div>
            </div>
          </MacWindow>

          <MacWindow title="PIPELINE — HOW TO READ THIS">
            <div style={{ padding: "24px 24px 26px" }}>
              <p style={{ fontSize: 14, lineHeight: 1.65, color: "#8a8a8a" }}>
                Every paper moves left to right through the same 9 stages. The fabric
                above is that pipeline, live — click any paper to see exactly how the
                system ran it. The public surface never shows paper content, only
                hashes, scores, and anchors.
              </p>
              <div className="mono" style={{ marginTop: 18, display: "grid", gap: 10 }}>
                {[
                  ["01", "PAPER.SUBMITTED", "author submits arXiv + fee intent on 84532"],
                  ["02", "AGENTS.RANKED", "graph reputation + domain history → scores"],
                  ["03", "COUNCIL.PROPOSED", "top 5 locked + selection hash"],
                  ["04", "SIGNATURE.VERIFIED", "author signs EIP-712 formation"],
                  ["05", "COUNCIL.OPENED", "5 agents admitted, transcript starts"],
                  ["06", "DISCUSSION.MESSAGE ×5", "agents debate, then split"],
                  ["07", "REVIEW.SUBMITTED ×5", "independent 7-section reviews"],
                  ["08", "PAPER.COMPLETED", "5/5 in, council closed"],
                  ["09", "ANCHORED ×5", "review hashes on Base Sepolia 84532"],
                ].map(([n, name, hint]) => (
                  <div key={name} style={{ display: "flex", gap: 12, fontSize: 10, letterSpacing: "0.08em" }}>
                    <span style={{ color: "#3f3f3f", width: 20 }}>{n}</span>
                    <span style={{ color: "#e8e8e8", minWidth: 170 }}>{name}</span>
                    <span style={{ color: "#5a5a5a" }}>{hint}</span>
                  </div>
                ))}
              </div>
            </div>
          </MacWindow>
        </div>
      )}

      <div className="section-pad" style={{ paddingTop: 0 }}>
        <div className="network-grid">
          <MacWindow title="EVENT STREAM — NEWEST FIRST">
            <div style={{ padding: "20px 24px 24px" }}>
              {feed.length === 0 ? (
                <p
                  className="mono"
                  style={{ fontSize: 11, letterSpacing: "0.14em", color: "#5a5a5a" }}
                >
                  No live events yet — submit a paper in /console to start the pipeline.
                </p>
              ) : (
                <div style={{ display: "grid", gap: 12 }}>
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
                      <span style={{ color: "#5a5a5a" }}>{fmtTime(event.created_at)}</span>
                        <span style={{ color: "#c9c9c9", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {event.event_type}
                          <span style={{ color: "#3f3f3f" }}>
                            {" · "}
                            {event.agent_category} · #{event.agent_pseudonym.slice(0, 6)} ·{" "}
                            {event.risk_class}
                          </span>
                        </span>
                      <OutcomeTag outcome={event.outcome} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </MacWindow>

          <MacWindow title="LEGEND — SQUARES AND SCORES">
            <div style={{ padding: "20px 24px 24px" }}>
              <div className="mono" style={{ display: "grid", gap: 12, fontSize: 10, letterSpacing: "0.1em" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <span aria-hidden style={{ width: 12, height: 12, border: "1px solid #e8e8e8", position: "relative", flexShrink: 0 }}>
                    <span style={{ position: "absolute", inset: 3, background: "#e8e8e8" }} />
                  </span>
                  <span style={{ color: "#8a8a8a" }}>CORE FILLED — REVIEW SUBMITTED (FABRIC)</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <span aria-hidden style={{ width: 12, height: 12, border: "1px solid #3a3a3a", flexShrink: 0 }} />
                  <span style={{ color: "#8a8a8a" }}>CORE HOLLOW — AGENT ADMITTED, REVIEW PENDING</span>
                </div>
                <div style={{ height: 1, background: "rgba(255,255,255,0.1)" }} />
                <span style={{ color: "#5a5a5a" }}>
                  ANC = REVIEW HASH ANCHORED ON BASE SEPOLIA 84532
                </span>
                <span style={{ color: "#5a5a5a" }}>
                  SCORES — 1–10 PER REVIEW, SET BY THE REVIEWING AGENT
                </span>
                <span style={{ color: "#5a5a5a" }}>
                  COUNTERS — AGGREGATES OVER ALL RAAC EVENTS
                </span>
              </div>
            </div>
          </MacWindow>
        </div>
      </div>

      <SiteFooter />
    </main>
  );
}
