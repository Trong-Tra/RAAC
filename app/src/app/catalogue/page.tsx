"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import Plate from "@/components/Plate";
import SiteFooter from "@/components/SiteFooter";
import SiteHeader from "@/components/SiteHeader";

type CataloguePaper = {
  id: string;
  title: string;
  domain: string;
  status: string;
  createdAt: string;
  paperHash: string;
  council: { status: string } | null;
  reviews: Array<{ score: number; anchored: boolean }>;
};

function shortHash(h: string) {
  return `${h.slice(0, 8)}…${h.slice(-6)}`;
}

function verdictOf(median: number): string {
  if (median >= 8) return "minor revision";
  if (median >= 5) return "major revision";
  return "reject";
}

function statusLabel(p: CataloguePaper): string {
  if (p.status === "completed" || (p.council?.status === "completed" && p.reviews.length >= 5)) return "published";
  if (p.council?.status === "active" || p.status === "reviewing") return "in sitting";
  if (p.council) return "council formed";
  return "submitted";
}

export default function CataloguePage() {
  const [papers, setPapers] = useState<CataloguePaper[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "published" | "in review">("all");

  useEffect(() => {
    fetch("/api/network/catalogue", { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => {
        if (!j.ok) throw new Error(j.error?.message ?? "load failed");
        setPapers(j.data as CataloguePaper[]);
      })
      .catch((e) => setErr(e.message));
  }, []);

  const list = (papers ?? []).filter((p) => {
    const label = statusLabel(p);
    if (filter === "published") return label === "published";
    if (filter === "in review") return label !== "published";
    return true;
  });

  const publishedCount = (papers ?? []).filter((p) => statusLabel(p) === "published").length;
  const reportCount = (papers ?? []).reduce((n, p) => n + p.reviews.length, 0);

  return (
    <main style={{ minHeight: "100dvh", background: "var(--paper)", display: "flex", flexDirection: "column" }}>
      <SiteHeader active="CATALOGUE" />

      <div className="section-pad page-measure" style={{ flex: 1, width: "100%" }}>
        <div className="guide-line">
          <span>RAAC · Vol. 84532</span>
          <span>the catalogue of entries</span>
          <span>public · Base Sepolia</span>
        </div>

        <div style={{ marginTop: 40, maxWidth: 740 }}>
          <h1 style={{ fontSize: "clamp(34px, 4.5vw, 56px)", fontWeight: 700, letterSpacing: "-0.02em", lineHeight: 1.08 }}>
            The catalogue.
          </h1>
          <p style={{ marginTop: 16, fontSize: 16, lineHeight: 1.7, color: "var(--ink-soft)", maxWidth: 680 }}>
            Every entry the network has examined, open to any reader — not only the wallet that submitted it.
            Titles, domains, scores, and anchors are public; paper content stays with its author until the
            reports are read in full on the entry page.
          </p>
        </div>

        <div
          style={{
            marginTop: 30,
            paddingTop: 20,
            borderTop: "1.5px solid var(--rule)",
            display: "flex",
            gap: 32,
            flexWrap: "wrap",
            alignItems: "baseline",
          }}
        >
          <span>
            <span style={{ fontSize: 34, fontWeight: 700, lineHeight: 1, letterSpacing: "-0.02em" }}>
              {papers == null ? "—" : papers.length}
            </span>{" "}
            <span className="sc" style={{ fontSize: 12.5, color: "var(--ink-soft)" }}>entries</span>
          </span>
          <span>
            <span style={{ fontSize: 34, fontWeight: 700, lineHeight: 1, letterSpacing: "-0.02em" }}>
              {papers == null ? "—" : publishedCount}
            </span>{" "}
            <span className="sc" style={{ fontSize: 12.5, color: "var(--ink-soft)" }}>published</span>
          </span>
          <span>
            <span style={{ fontSize: 34, fontWeight: 700, lineHeight: 1, letterSpacing: "-0.02em" }}>
              {papers == null ? "—" : reportCount}
            </span>{" "}
            <span className="sc" style={{ fontSize: 12.5, color: "var(--ink-soft)" }}>reports</span>
          </span>

          <span style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
            {(["all", "published", "in review"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className="sc"
                style={{
                  background: filter === f ? "var(--ink)" : "transparent",
                  color: filter === f ? "var(--paper-raised)" : "var(--ink-soft)",
                  border: "1px solid var(--rule)",
                  padding: "6px 12px",
                  fontSize: 11,
                  letterSpacing: "0.1em",
                  cursor: "pointer",
                  font: "inherit",
                  fontWeight: filter === f ? 700 : 400,
                }}
              >
                {f === "in review" ? "in review" : f}
              </button>
            ))}
          </span>
        </div>

        <div style={{ marginTop: 36 }}>
          <Plate
            caption="Plate i. — Entries in the volume"
            plateNo={papers == null ? "…" : `${list.length} shown`}
          >
            {err ? (
              <p style={{ color: "var(--madder)", fontSize: 14.5 }}>{err}</p>
            ) : !papers ? (
              <p className="mono" style={{ fontSize: 10, letterSpacing: "0.14em", color: "var(--ink-faint)" }}>
                Consulting the volume…
              </p>
            ) : list.length === 0 ? (
              <p style={{ fontSize: 15, fontStyle: "italic", color: "var(--ink-faint)" }}>
                Nothing under this filter —{" "}
                <Link href="/console" style={{ color: "var(--vermilion-deep)" }}>
                  submit an entry
                </Link>{" "}
                to open the catalogue.
              </p>
            ) : (
              <div>
                {list.map((p, i) => {
                  const scores = p.reviews.map((r) => r.score).sort((a, b) => a - b);
                  const median = scores.length ? scores[Math.floor(scores.length / 2)] : null;
                  const anchored = p.reviews.filter((r) => r.anchored).length;
                  const label = statusLabel(p);
                  const isPublished = label === "published";

                  return (
                    <div
                      key={p.id}
                      style={{
                        display: "block",
                        width: "100%",
                        textAlign: "left",
                        padding: "16px 4px",
                        borderTop: i === 0 ? "none" : "1px solid var(--rule-faint)",
                        background: "transparent",
                        border: "none",
                        borderTopWidth: i === 0 ? 0 : 1,
                        borderTopStyle: "solid",
                        borderTopColor: i === 0 ? "transparent" : "var(--rule-faint)",
                        cursor: "pointer",
                        font: "inherit",
                      }}
                    >
                      <Link
                        href={`/papers/${p.id}`}
                        style={{ textDecoration: "none", color: "inherit", display: "block" }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "baseline", flexWrap: "wrap" }}>
                          <span style={{ fontSize: 17, fontWeight: 600, letterSpacing: "-0.01em", color: "var(--ink)", maxWidth: 640 }}>
                            {p.title}
                          </span>
                          <span className="mono" style={{ fontSize: 9.5, letterSpacing: "0.1em", color: "var(--ink-faint)", flexShrink: 0 }}>
                            {p.domain.toUpperCase()} · {label.toUpperCase()}
                          </span>
                        </div>

                        <div style={{ marginTop: 10, display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                          <span className="mono" style={{ fontSize: 9.5, letterSpacing: "0.08em", color: "var(--ink-faint)" }}>
                            {new Date(p.createdAt).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })}
                            {" · "}
                            {shortHash(p.paperHash)}
                          </span>

                          {p.reviews.length > 0 && (
                            <span style={{ display: "flex", gap: 6, alignItems: "baseline" }}>
                              {p.reviews.map((r, j) => (
                                <span
                                  key={j}
                                  className="mono"
                                  style={{
                                    fontSize: 10,
                                    letterSpacing: "0.06em",
                                    padding: "3px 7px",
                                    border: "1px solid var(--rule-soft)",
                                    color: r.score >= 7 ? "var(--emerald)" : r.score >= 5 ? "var(--ink-soft)" : "var(--madder)",
                                  }}
                                >
                                  {r.score}
                                  {r.anchored ? "✓" : ""}
                                </span>
                              ))}
                            </span>
                          )}

                          {median != null && (
                            <span className="sc" style={{ fontSize: 13, fontWeight: 700, color: isPublished ? "var(--ink)" : "var(--ink-soft)" }}>
                              median {median}/10 · {verdictOf(median)}
                            </span>
                          )}

                          {anchored > 0 && (
                            <span className="mono" style={{ fontSize: 9, letterSpacing: "0.1em", color: "var(--emerald)" }}>
                              {anchored}/5 ANCHORED
                            </span>
                          )}

                          <span
                            className="sc"
                            style={{
                              marginLeft: "auto",
                              fontSize: 13,
                              color: "var(--vermilion-deep)",
                              fontWeight: 700,
                            }}
                          >
                            Read the reports →
                          </span>
                        </div>
                      </Link>
                    </div>
                  );
                })}
              </div>
            )}
          </Plate>
        </div>

        <p
          style={{
            marginTop: 28,
            fontSize: 14,
            lineHeight: 1.65,
            color: "var(--ink-faint)",
            maxWidth: 620,
          }}
        >
          <b className="sc" style={{ color: "var(--ink-soft)" }}>catalogue, n.</b>{" "}
          The public shelf of this volume. Scores and anchors are verifiable on Base Sepolia; full reports open
          on each entry page without a wallet.
        </p>
      </div>

      <SiteFooter />
    </main>
  );
}
