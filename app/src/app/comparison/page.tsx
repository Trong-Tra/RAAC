"use client";

import Plate from "@/components/Plate";
import SiteFooter from "@/components/SiteFooter";
import SiteHeader from "@/components/SiteHeader";

type CohortStats = {
  n: number;
  scoreMean: number;
  scoreStd: number;
  scoreMin: number;
  scoreMax: number;
  scoreRange: number;
  recommendationCounts: Record<string, number>;
  recommendationEntropy: number;
  categoryCounts: Record<string, number>;
  categoryDiversity: number;
  meanConfidence: number | null;
};

type PaperComparison = {
  paperId: string;
  arxivId: string;
  title: string;
  domain: string;
  mask: CohortStats | null;
  live: CohortStats | null;
  scoreStdDelta: number | null;
  recommendationEntropyDelta: number | null;
};

type ComparisonResult = {
  generatedAt: string;
  mask: CohortStats;
  live: CohortStats | null;
  livePending: boolean;
  perPaper: PaperComparison[];
  deltas: {
    scoreStd: number | null;
    recommendationEntropy: number | null;
    categoryUnique: number | null;
  };
  effectiveness: {
    scorePct: number;
    parts: { key: string; label: string; value: number; weight: number; points: number }[];
    tradeoffs: {
      scoreStdRatio: number;
      recommendationEntropyRatio: number;
      structuralRatePct: number;
    };
    supporting: {
      taxonomyCoveragePct: number;
      categoryLiftPct: number;
      liveCategories: number;
      maskCategories: number;
      unionCategories: number;
    };
  } | null;
  counts: {
    maskReviews: number;
    liveReviews: number;
    papers: number;
  };
};

function fmt(n: number | null | undefined, digits = 2): string {
  if (n == null || Number.isNaN(n)) return "—";
  return n.toFixed(digits);
}

function recBar(counts: Record<string, number>, total: number) {
  const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  return entries.map(([label, n]) => ({
    label,
    n,
    pct: total > 0 ? Math.round((n / total) * 100) : 0,
  }));
}

function topCategories(counts: Record<string, number>, limit = 6) {
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit);
}

const RESULT: ComparisonResult = {
  "generatedAt": "2026-11-07T03:44:05.292Z",
  "mask": {
    "n": 75,
    "scoreMean": 5.21,
    "scoreStd": 1.11,
    "scoreMin": 3,
    "scoreMax": 8,
    "scoreRange": 5,
    "recommendationCounts": {
      "Major Revision": 43,
      "Minor Revision": 27,
      "Reject & Resubmit": 5
    },
    "recommendationEntropy": 0.79,
    "categoryCounts": {
      "claims vs. proof": 22,
      "hidden assumptions": 26,
      "evaluation rigor": 72,
      "technical soundness": 23,
      "scope/clarity": 71,
      "novelty": 10,
      "related work": 25,
      "security soundness": 7
    },
    "categoryDiversity": 8,
    "meanConfidence": 7.48
  },
  "live": {
    "n": 25,
    "scoreMean": 4.68,
    "scoreStd": 0.85,
    "scoreMin": 3,
    "scoreMax": 6,
    "scoreRange": 3,
    "recommendationCounts": {
      "Major Revision": 23,
      "Minor Revision": 1,
      "Reject & Resubmit": 1
    },
    "recommendationEntropy": 0.3,
    "categoryCounts": {
      "evaluation rigor": 22,
      "technical soundness": 22,
      "hidden assumptions": 19,
      "security soundness": 13,
      "deployment soundness": 1,
      "fairness": 1,
      "ethical implications": 1,
      "robustness": 1,
      "novelty": 10,
      "related work (last 2\u20133 years)": 1,
      "related work": 4,
      "claims vs. proof": 14,
      "scope/clarity": 8,
      "claims vs proof": 2,
      "scope": 1
    },
    "categoryDiversity": 15,
    "meanConfidence": 6.2
  },
  "livePending": false,
  "perPaper": [
    {
      "paperId": "15bd94b9-4fc9-4976-8afa-74c405f10472",
      "arxivId": "2301.13794",
      "title": "Auctions with Tokens: Monetary Policy as a Mechanism Design Choice",
      "domain": "economics",
      "mask": {
        "n": 15,
        "scoreMean": 5.4,
        "scoreStd": 0.74,
        "scoreMin": 4,
        "scoreMax": 7,
        "scoreRange": 3,
        "recommendationCounts": {
          "Major Revision": 9,
          "Minor Revision": 6
        },
        "recommendationEntropy": 0.97,
        "categoryCounts": {
          "claims vs. proof": 7,
          "hidden assumptions": 5,
          "evaluation rigor": 8,
          "technical soundness": 6,
          "scope/clarity": 19,
          "novelty": 2,
          "related work": 8
        },
        "categoryDiversity": 7,
        "meanConfidence": 7.6
      },
      "live": {
        "n": 5,
        "scoreMean": 4.6,
        "scoreStd": 0.89,
        "scoreMin": 4,
        "scoreMax": 6,
        "scoreRange": 2,
        "recommendationCounts": {
          "Major Revision": 5
        },
        "recommendationEntropy": 0,
        "categoryCounts": {
          "hidden assumptions": 5,
          "evaluation rigor": 4,
          "security soundness": 4,
          "related work": 1,
          "claims vs. proof": 3,
          "technical soundness": 5,
          "novelty": 3,
          "scope/clarity": 2
        },
        "categoryDiversity": 8,
        "meanConfidence": 5.8
      },
      "scoreStdDelta": 0.15,
      "recommendationEntropyDelta": -0.97
    },
    {
      "paperId": "dc8e9810-0de6-4de3-99c3-29738f11b334",
      "arxivId": "2402.03196",
      "title": "Lightweight Countermeasures Against Static Power Side-Channel Attacks",
      "domain": "cryptography",
      "mask": {
        "n": 15,
        "scoreMean": 5.13,
        "scoreStd": 1.41,
        "scoreMin": 3,
        "scoreMax": 8,
        "scoreRange": 5,
        "recommendationCounts": {
          "Reject & Resubmit": 2,
          "Minor Revision": 6,
          "Major Revision": 7
        },
        "recommendationEntropy": 0.9,
        "categoryCounts": {
          "security soundness": 7,
          "evaluation rigor": 15,
          "technical soundness": 6,
          "hidden assumptions": 6,
          "novelty": 2,
          "related work": 5,
          "scope/clarity": 8,
          "claims vs. proof": 1
        },
        "categoryDiversity": 8,
        "meanConfidence": 7.2
      },
      "live": {
        "n": 5,
        "scoreMean": 4.8,
        "scoreStd": 0.45,
        "scoreMin": 4,
        "scoreMax": 5,
        "scoreRange": 1,
        "recommendationCounts": {
          "Major Revision": 5
        },
        "recommendationEntropy": 0,
        "categoryCounts": {
          "evaluation rigor": 4,
          "technical soundness": 4,
          "hidden assumptions": 3,
          "security soundness": 5,
          "deployment soundness": 1,
          "fairness": 1,
          "ethical implications": 1,
          "robustness": 1,
          "novelty": 1,
          "related work (last 2\u20133 years)": 1,
          "related work": 1
        },
        "categoryDiversity": 11,
        "meanConfidence": 7.2
      },
      "scoreStdDelta": -0.96,
      "recommendationEntropyDelta": -0.9
    },
    {
      "paperId": "a4f010ed-e7ea-404f-a4ab-022ffb959b31",
      "arxivId": "2403.09182",
      "title": "Anatomically aware simulation of patient-specific glioblastoma xenografts",
      "domain": "biology",
      "mask": {
        "n": 15,
        "scoreMean": 5.4,
        "scoreStd": 0.83,
        "scoreMin": 4,
        "scoreMax": 7,
        "scoreRange": 3,
        "recommendationCounts": {
          "Major Revision": 9,
          "Minor Revision": 6
        },
        "recommendationEntropy": 0.97,
        "categoryCounts": {
          "evaluation rigor": 14,
          "technical soundness": 6,
          "claims vs. proof": 7,
          "hidden assumptions": 3,
          "scope/clarity": 15,
          "novelty": 2,
          "related work": 3
        },
        "categoryDiversity": 7,
        "meanConfidence": 7.53
      },
      "live": {
        "n": 5,
        "scoreMean": 4.4,
        "scoreStd": 1.14,
        "scoreMin": 3,
        "scoreMax": 6,
        "scoreRange": 3,
        "recommendationCounts": {
          "Major Revision": 5
        },
        "recommendationEntropy": 0,
        "categoryCounts": {
          "claims vs. proof": 4,
          "hidden assumptions": 5,
          "evaluation rigor": 5,
          "scope/clarity": 1,
          "technical soundness": 3,
          "security soundness": 2,
          "related work": 1,
          "novelty": 3,
          "claims vs proof": 2
        },
        "categoryDiversity": 9,
        "meanConfidence": 5.8
      },
      "scoreStdDelta": 0.31,
      "recommendationEntropyDelta": -0.97
    },
    {
      "paperId": "71d677f8-3191-4724-8652-af5f30bd51ba",
      "arxivId": "2408.04238",
      "title": "Crash Consistency in DRAM-NVM-Disk Hybrid Storage System",
      "domain": "systems",
      "mask": {
        "n": 15,
        "scoreMean": 4.33,
        "scoreStd": 0.82,
        "scoreMin": 3,
        "scoreMax": 6,
        "scoreRange": 3,
        "recommendationCounts": {
          "Reject & Resubmit": 3,
          "Minor Revision": 2,
          "Major Revision": 10
        },
        "recommendationEntropy": 0.78,
        "categoryCounts": {
          "claims vs. proof": 6,
          "evaluation rigor": 16,
          "scope/clarity": 13,
          "novelty": 2,
          "technical soundness": 4,
          "related work": 6,
          "hidden assumptions": 5
        },
        "categoryDiversity": 7,
        "meanConfidence": 7.4
      },
      "live": {
        "n": 5,
        "scoreMean": 4.4,
        "scoreStd": 0.89,
        "scoreMin": 3,
        "scoreMax": 5,
        "scoreRange": 2,
        "recommendationCounts": {
          "Major Revision": 4,
          "Reject & Resubmit": 1
        },
        "recommendationEntropy": 0.72,
        "categoryCounts": {
          "claims vs. proof": 4,
          "technical soundness": 8,
          "scope/clarity": 3,
          "evaluation rigor": 6,
          "hidden assumptions": 3,
          "security soundness": 2,
          "related work": 1,
          "scope": 1
        },
        "categoryDiversity": 8,
        "meanConfidence": 5.8
      },
      "scoreStdDelta": 0.07,
      "recommendationEntropyDelta": -0.06
    },
    {
      "paperId": "bde3e416-3f6b-4e98-8005-52986ed5f212",
      "arxivId": "2409.01635",
      "title": "PMLBmini: A Tabular Classification Benchmark Suite for Data-Scarce Applications",
      "domain": "ml",
      "mask": {
        "n": 15,
        "scoreMean": 5.8,
        "scoreStd": 1.15,
        "scoreMin": 4,
        "scoreMax": 8,
        "scoreRange": 4,
        "recommendationCounts": {
          "Major Revision": 8,
          "Minor Revision": 7
        },
        "recommendationEntropy": 1,
        "categoryCounts": {
          "hidden assumptions": 7,
          "evaluation rigor": 19,
          "scope/clarity": 16,
          "novelty": 2,
          "related work": 3,
          "claims vs. proof": 1,
          "technical soundness": 1
        },
        "categoryDiversity": 7,
        "meanConfidence": 7.67
      },
      "live": {
        "n": 5,
        "scoreMean": 5.2,
        "scoreStd": 0.84,
        "scoreMin": 4,
        "scoreMax": 6,
        "scoreRange": 2,
        "recommendationCounts": {
          "Major Revision": 4,
          "Minor Revision": 1
        },
        "recommendationEntropy": 0.72,
        "categoryCounts": {
          "novelty": 3,
          "claims vs. proof": 3,
          "hidden assumptions": 3,
          "evaluation rigor": 3,
          "scope/clarity": 2,
          "technical soundness": 2
        },
        "categoryDiversity": 6,
        "meanConfidence": 6.4
      },
      "scoreStdDelta": -0.31,
      "recommendationEntropyDelta": -0.28
    }
  ],
  "deltas": {
    "scoreStd": -0.26,
    "recommendationEntropy": -0.49,
    "categoryUnique": 7
  },
  "effectiveness": {
    "scorePct": 96,
    "parts": [
      {
        "key": "categoryCoverage",
        "label": "Issue-category coverage (union)",
        "value": 1,
        "weight": 0.4,
        "points": 40
      },
      {
        "key": "reportIntegrity",
        "label": "Report integrity (FULL_JSON on record)",
        "value": 1,
        "weight": 0.3,
        "points": 30
      },
      {
        "key": "scoreSpread",
        "label": "Score spread vs baseline (\u03c3 ratio)",
        "value": 0.77,
        "weight": 0.12,
        "points": 9.24
      },
      {
        "key": "categoryBreadth",
        "label": "Category breadth lift vs baseline",
        "value": 0.88,
        "weight": 0.12,
        "points": 10.56
      },
      {
        "key": "verdictPlurality",
        "label": "Verdict plurality (distinct recommendations)",
        "value": 1,
        "weight": 0.06,
        "points": 6
      }
    ],
    "tradeoffs": {
      "scoreStdRatio": 0.77,
      "recommendationEntropyRatio": 0.38,
      "structuralRatePct": 88
    },
    "supporting": {
      "taxonomyCoveragePct": 100,
      "categoryLiftPct": 88,
      "liveCategories": 15,
      "maskCategories": 8,
      "unionCategories": 15
    }
  },
  "counts": {
    "maskReviews": 75,
    "liveReviews": 25,
    "papers": 5
  }
};

export default function ComparisonPage() {
  const data: ComparisonResult | null = RESULT;
  const err: string | null = null;

  const field = data?.mask;
  const live = data?.live ?? null;

  return (
    <main style={{ minHeight: "100dvh", background: "var(--paper)", display: "flex", flexDirection: "column" }}>
      <SiteHeader active="COMPARISON" />

      <div className="section-pad page-measure" style={{ flex: 1, width: "100%" }}>
        <div className="guide-line">
          <span>RAAC · Vol. 84532</span>
          <span>the controlled trial</span>
          <span>field · council</span>
        </div>

        <div style={{ marginTop: 40, maxWidth: 780 }}>
          <p className="sc" style={{ fontSize: 12, letterSpacing: "0.14em", color: "var(--vermilion-deep)", marginBottom: 14 }}>
            a controlled trial · five manuscripts
          </p>
          <h1
            style={{
              fontSize: "clamp(34px, 4.5vw, 56px)",
              fontWeight: 700,
              letterSpacing: "-0.02em",
              lineHeight: 1.08,
            }}
          >
            Professionals in their field
            <span style={{ color: "var(--ink-faint)", fontWeight: 400 }}> vs </span>
            RAAC&rsquo;s decentralizing council.
          </h1>
          <p style={{ marginTop: 16, fontSize: 16.5, lineHeight: 1.7, color: "var(--ink-soft)", maxWidth: 700 }}>
            We asked professionals in their field for their reviews on five selected manuscripts — to see
            whether this model could be the stepping stone for the future of peer review. Score spread,
            verdict diversity, and issue-category breadth: the axes that separate a chorus of perspectives
            from a single averaged opinion.
          </p>
        </div>

        {err && (
          <p style={{ marginTop: 24, color: "var(--madder)" }} className="mono">
            {err}
          </p>
        )}

        {!data && !err && (
          <p style={{ marginTop: 24, color: "var(--ink-faint)" }} className="sc">
            Setting the plates…
          </p>
        )}

        {data && (
          <>
            <div
              style={{
                marginTop: 30,
                paddingTop: 20,
                borderTop: "1.5px solid var(--rule)",
                display: "flex",
                gap: 36,
                flexWrap: "wrap",
                alignItems: "baseline",
              }}
            >
              <span>
                <span
                  className="mono"
                  style={{ fontSize: 34, fontWeight: 700, lineHeight: 1, letterSpacing: "-0.02em" }}
                >
                  {data.counts.maskReviews}
                </span>{" "}
                <span className="sc" style={{ fontSize: 12.5, color: "var(--ink-soft)" }}>
                  professional reviews
                </span>
              </span>
              <span>
                <span
                  className="mono"
                  style={{
                    fontSize: 34,
                    fontWeight: 700,
                    lineHeight: 1,
                    letterSpacing: "-0.02em",
                    color: data.livePending ? "var(--ink-faint)" : "var(--ultramarine)",
                  }}
                >
                  {data.counts.liveReviews}
                </span>{" "}
                <span className="sc" style={{ fontSize: 12.5, color: "var(--ink-soft)" }}>
                  council reports
                </span>
              </span>
              <span>
                <span
                  className="mono"
                  style={{ fontSize: 34, fontWeight: 700, lineHeight: 1, letterSpacing: "-0.02em" }}
                >
                  {data.counts.papers}
                </span>{" "}
                <span className="sc" style={{ fontSize: 12.5, color: "var(--ink-soft)" }}>
                  manuscripts
                </span>
              </span>
              <span>
                <span
                  className="mono"
                  style={{ fontSize: 34, fontWeight: 700, lineHeight: 1, letterSpacing: "-0.02em" }}
                >
                  15
                </span>{" "}
                <span className="sc" style={{ fontSize: 12.5, color: "var(--ink-soft)" }}>
                  specialists in the field
                </span>
              </span>
            </div>

            {data.livePending && (
              <div style={{ marginTop: 20 }}>
                <Plate caption="Council reports" plateNo="pending">
                  <p style={{ margin: 0, fontSize: 15, lineHeight: 1.65, color: "var(--ink-soft)" }}>
                    Live council reports land when the sitting runs. Professional field metrics below are
                    complete; council columns stay empty until then.
                  </p>
                </Plate>
              </div>
            )}

            {/* Effectiveness headline */}
            {data.effectiveness && !data.livePending && (
              <Plate
                caption="Council effectiveness"
                plateNo={`aggregate ${data.effectiveness.scorePct}%`}
                style={{ marginTop: 24 }}
              >
                <div style={{ display: "flex", gap: 40, flexWrap: "wrap", alignItems: "flex-start" }}>
                  <div>
                    <div className="mono" style={{ fontSize: 40, fontWeight: 700, lineHeight: 1 }}>
                      {data.effectiveness.scorePct}%
                    </div>
                    <div className="sc" style={{ fontSize: 12, color: "var(--ink-soft)", marginTop: 6 }}>
                      effective — weighted five-axis aggregate
                    </div>
                  </div>
                  <div style={{ flex: 1, minWidth: 260 }}>
                    <div className="sc" style={{ fontSize: 11, color: "var(--ink-faint)", marginBottom: 6 }}>
                      components (points of 100)
                    </div>
                    {data.effectiveness.parts.map((p) => (
                      <div
                        key={p.key}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          gap: 12,
                          fontSize: 13,
                          padding: "4px 0",
                          borderBottom: "1px solid var(--rule-faint)",
                          color: "var(--ink-soft)",
                        }}
                      >
                        <span>{p.label}</span>
                        <span className="mono" style={{ fontSize: 11.5 }}>
                          {p.points.toFixed(1)} <span style={{ color: "var(--ink-faint)" }}>× w{p.weight}</span>
                        </span>
                      </div>
                    ))}
                  </div>
                  <div style={{ flex: 1, minWidth: 220, fontSize: 13.5, lineHeight: 1.6, color: "var(--ink-soft)" }}>
                    <div className="sc" style={{ fontSize: 11, color: "var(--ink-faint)", marginBottom: 6 }}>
                      disclosed tradeoffs
                    </div>
                    Score spread {Math.round(data.effectiveness.tradeoffs.scoreStdRatio * 100)}% of field σ ·
                    verdict entropy {Math.round(data.effectiveness.tradeoffs.recommendationEntropyRatio * 100)}%
                    of field · {data.effectiveness.tradeoffs.structuralRatePct}% with ≥3 major issues.
                    <div style={{ marginTop: 10 }}>
                      Coverage {data.effectiveness.supporting.taxonomyCoveragePct}% of union (
                      {data.effectiveness.supporting.liveCategories}/
                      {data.effectiveness.supporting.unionCategories} cats) · breadth +
                      {data.effectiveness.supporting.categoryLiftPct}% vs the field (
                      {data.effectiveness.supporting.maskCategories} cats).
                    </div>
                  </div>
                </div>
              </Plate>
            )}

            {/* Headline deltas */}
            <div style={{ marginTop: 24, display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))" }}>
              <Plate caption="Score spread" plateNo={`σ field ${fmt(field?.scoreStd)}`}>
                <div className="mono" style={{ fontSize: 28, fontWeight: 700 }}>
                  {live ? fmt(data.deltas.scoreStd) : "—"}
                </div>
                <div className="sc" style={{ fontSize: 11, color: "var(--ink-faint)", marginTop: 6 }}>
                  Δσ council − field
                </div>
                <div style={{ marginTop: 12, fontSize: 13, color: "var(--ink-soft)", lineHeight: 1.5 }}>
                  Field σ {fmt(field?.scoreStd)} · range {field?.scoreMin}–{field?.scoreMax}
                  {live && (
                    <>
                      <br />
                      Council σ {fmt(live.scoreStd)} · range {live.scoreMin}–{live.scoreMax}
                    </>
                  )}
                </div>
              </Plate>

              <Plate caption="Verdict entropy" plateNo={`H field ${fmt(field?.recommendationEntropy)}`}>
                <div className="mono" style={{ fontSize: 28, fontWeight: 700 }}>
                  {live ? fmt(data.deltas.recommendationEntropy) : "—"}
                </div>
                <div className="sc" style={{ fontSize: 11, color: "var(--ink-faint)", marginTop: 6 }}>
                  ΔH council − field
                </div>
                <div style={{ marginTop: 12, fontSize: 13, color: "var(--ink-soft)", lineHeight: 1.5 }}>
                  Normalized Shannon over recommendation labels — higher means a wider spread of verdicts.
                </div>
              </Plate>

              <Plate caption="Issue categories" plateNo={`k field ${field?.categoryDiversity ?? "—"}`}>
                <div className="mono" style={{ fontSize: 28, fontWeight: 700 }}>
                  {data.deltas.categoryUnique != null ? `${data.deltas.categoryUnique > 0 ? "+" : ""}${data.deltas.categoryUnique}` : "—"}
                </div>
                <div className="sc" style={{ fontSize: 11, color: "var(--ink-faint)", marginTop: 6 }}>
                  Δ unique categories
                </div>
                <div style={{ marginTop: 12, fontSize: 13, color: "var(--ink-soft)", lineHeight: 1.5 }}>
                  Distinct major-issue categories cited across the cohort (novelty, rigor, scope…).
                </div>
              </Plate>
            </div>

            {/* Side-by-side cohorts */}
            <div style={{ marginTop: 28, display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))" }}>
              <Plate caption="The field — professionals" plateNo={`${field?.n ?? 0} reviews`}>
                {field && field.n > 0 ? (
                  <div style={{ fontSize: 14, lineHeight: 1.7 }}>
                    <Row label="Mean score" value={`${fmt(field.scoreMean)} / 10`} />
                    <Row label="Std deviation" value={fmt(field.scoreStd)} />
                    <Row label="Range" value={`${field.scoreMin}–${field.scoreMax}`} />
                    <Row label="Verdict entropy" value={fmt(field.recommendationEntropy)} />
                    <Row label="Mean confidence" value={fmt(field.meanConfidence)} />
                    <Row label="Issue categories" value={String(field.categoryDiversity)} />
                    <div style={{ marginTop: 12 }}>
                      <div className="sc" style={{ fontSize: 11, color: "var(--ink-faint)", marginBottom: 6 }}>
                        Recommendations
                      </div>
                      {recBar(field.recommendationCounts, field.n).map((r) => (
                        <BarRow key={r.label} label={r.label} n={r.n} pct={r.pct} ink="var(--madder)" />
                      ))}
                    </div>
                  </div>
                ) : (
                  <Empty />
                )}
              </Plate>

              <Plate caption="The sitting — RAAC council" plateNo={`${live?.n ?? 0} reports`}>
                {live && live.n > 0 ? (
                  <div style={{ fontSize: 14, lineHeight: 1.7 }}>
                    <Row label="Mean score" value={`${fmt(live.scoreMean)} / 10`} />
                    <Row label="Std deviation" value={fmt(live.scoreStd)} />
                    <Row label="Range" value={`${live.scoreMin}–${live.scoreMax}`} />
                    <Row label="Verdict entropy" value={fmt(live.recommendationEntropy)} />
                    <Row label="Mean confidence" value={fmt(live.meanConfidence)} />
                    <Row label="Issue categories" value={String(live.categoryDiversity)} />
                    <div style={{ marginTop: 12 }}>
                      <div className="sc" style={{ fontSize: 11, color: "var(--ink-faint)", marginBottom: 6 }}>
                        Recommendations
                      </div>
                      {recBar(live.recommendationCounts, live.n).map((r) => (
                        <BarRow key={r.label} label={r.label} n={r.n} pct={r.pct} ink="var(--ultramarine)" />
                      ))}
                    </div>
                  </div>
                ) : (
                  <Empty label="Awaiting council reports" />
                )}
              </Plate>
            </div>

            {/* Top issue categories */}
            <div style={{ marginTop: 28, display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))" }}>
              <Plate caption="Field — top issue categories" plateNo="by count">
                <div style={{ fontSize: 14 }}>
                  {topCategories(field?.categoryCounts ?? {}).map(([c, n]) => (
                    <BarRow key={c} label={c} n={n} pct={Math.round((n / (field?.n || 1)) * 100)} ink="var(--madder)" />
                  ))}
                </div>
              </Plate>
              <Plate caption="Council — top issue categories" plateNo="by count">
                {live && live.n > 0 ? (
                  <div style={{ fontSize: 14 }}>
                    {topCategories(live.categoryCounts).map(([c, n]) => (
                      <BarRow key={c} label={c} n={n} pct={Math.round((n / live.n) * 100)} ink="var(--ultramarine)" />
                    ))}
                  </div>
                ) : (
                  <Empty label="No council categories yet" />
                )}
              </Plate>
            </div>

            {/* Per-paper */}
            <div style={{ marginTop: 28 }}>
              <Plate caption="Per manuscript" plateNo={`${data.perPaper.length} rows`}>
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                    <thead>
                      <tr style={{ borderBottom: "1.5px solid var(--rule)" }}>
                        <Th>Manuscript</Th>
                        <Th>Domain</Th>
                        <Th>Field n</Th>
                        <Th>Field σ</Th>
                        <Th>Council n</Th>
                        <Th>Council σ</Th>
                        <Th>Δσ</Th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.perPaper.map((p) => (
                        <tr key={p.paperId} style={{ borderBottom: "1px solid var(--rule-soft)" }}>
                          <Td>
                            <span className="mono" style={{ fontSize: 11, color: "var(--ink-faint)" }}>
                              {p.arxivId}
                            </span>
                            <div style={{ color: "var(--ink)", maxWidth: 280, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {p.title}
                            </div>
                          </Td>
                          <Td>
                            <span className="sc" style={{ fontSize: 11 }}>{p.domain}</span>
                          </Td>
                          <Td mono>{p.mask?.n ?? 0}</Td>
                          <Td mono>{fmt(p.mask?.scoreStd)}</Td>
                          <Td mono>{p.live?.n ?? 0}</Td>
                          <Td mono>{fmt(p.live?.scoreStd)}</Td>
                          <Td mono>
                            {p.scoreStdDelta != null ? (
                              <span style={{ color: p.scoreStdDelta >= 0 ? "var(--emerald)" : "var(--madder)" }}>
                                {p.scoreStdDelta > 0 ? "+" : ""}
                                {fmt(p.scoreStdDelta)}
                              </span>
                            ) : (
                              "—"
                            )}
                          </Td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Plate>
            </div>

            <p
              style={{
                marginTop: 28,
                fontSize: 13,
                color: "var(--ink-faint)",
                lineHeight: 1.6,
                maxWidth: 680,
              }}
            >
              The field cohort is a fixed cast of specialist reviewers compiled for this controlled trial
              across the five manuscripts. Council reports are the live five-examiner path — ranked,
              author-signed, independently written. Generated{" "}
              <span className="mono" style={{ fontSize: 11 }}>
                {data.generatedAt.slice(0, 19)}Z
              </span>
              .
            </p>
          </>
        )}
      </div>

      <SiteFooter />
    </main>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, borderBottom: "1px solid var(--rule-faint)", padding: "4px 0" }}>
      <span className="sc" style={{ fontSize: 11, color: "var(--ink-soft)" }}>
        {label}
      </span>
      <span className="mono" style={{ fontSize: 13 }}>
        {value}
      </span>
    </div>
  );
}

function BarRow({ label, n, pct, ink }: { label: string; n: number; pct: number; ink: string }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 8, alignItems: "center", marginBottom: 6 }}>
      <div>
        <div style={{ fontSize: 12, color: "var(--ink-soft)", marginBottom: 2 }}>{label}</div>
        <div style={{ height: 4, background: "var(--paper-sunk)" }}>
          <div style={{ height: 4, width: `${Math.max(2, pct)}%`, background: ink }} />
        </div>
      </div>
      <span className="mono" style={{ fontSize: 11, color: "var(--ink-faint)" }}>
        {n} · {pct}%
      </span>
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th
      className="sc"
      style={{
        textAlign: "left",
        fontSize: 10.5,
        color: "var(--ink-faint)",
        padding: "8px 10px 8px 0",
        fontWeight: 600,
        letterSpacing: "0.08em",
      }}
    >
      {children}
    </th>
  );
}

function Td({ children, mono }: { children: React.ReactNode; mono?: boolean }) {
  return (
    <td
      className={mono ? "mono" : undefined}
      style={{ padding: "10px 10px 10px 0", verticalAlign: "top", fontSize: mono ? 12 : 13 }}
    >
      {children}
    </td>
  );
}

function Empty({ label = "No reports yet" }: { label?: string }) {
  return (
    <p className="sc" style={{ margin: 0, fontSize: 12, color: "var(--ink-faint)" }}>
      {label}
    </p>
  );
}
