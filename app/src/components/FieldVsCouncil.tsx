"use client";

import Link from "next/link";
import { motion } from "motion/react";
import CountUp from "@/components/CountUp";
import Plate from "@/components/Plate";
import Reveal from "@/components/Reveal";

const EXAMINER_INKS = [
  "var(--ultramarine)",
  "var(--emerald)",
  "var(--madder)",
  "var(--sepia)",
  "var(--violet)",
];
const ROMAN = ["i", "ii", "iii", "iv", "v"];

type Effectiveness = {
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
};

/** Engraving-style bust silhouette — head + shoulders, print-stock ink. */
function Bust({ fill, size = 36, opacity = 1 }: { fill: string; size?: number; opacity?: number }) {
  return (
    <svg
      width={size}
      height={size * 1.15}
      viewBox="0 0 40 46"
      aria-hidden
      style={{ display: "block", opacity }}
    >
      {/* head */}
      <circle cx="20" cy="13" r="9.5" fill={fill} />
      {/* shoulders / coat */}
      <path
        d="M4 44c0-11 7.2-18 16-18s16 7 16 18"
        fill={fill}
      />
      {/* collar notch (negative space) */}
      <path d="M16 27.5 20 34l4-6.5" fill="var(--paper)" opacity="0.35" />
    </svg>
  );
}

/**
 * FieldVsCouncil — landing duel plate.
 * Frame: professionals in their field vs RAAC's decentralized five-examiner sitting.
 * Headline metric is the weighted effectiveness aggregate (never raw 100).
 */
export default function FieldVsCouncil({
  effectiveness: eff,
  professionalCount = 15,
  manuscriptCount = 5,
}: {
  effectiveness: Effectiveness | null;
  professionalCount?: number;
  manuscriptCount?: number;
}) {
  if (!eff) return null;

  const lift = eff.supporting.categoryLiftPct;
  const liveCats = eff.supporting.liveCategories;
  const maskCats = eff.supporting.maskCategories;
  const unionCats = eff.supporting.unionCategories;

  return (
    <Reveal style={{ marginTop: "14vh" }}>
      {/* Section headword */}
      <div style={{ maxWidth: 920 }}>
        <p className="sc" style={{ fontSize: 12, letterSpacing: "0.14em", color: "var(--vermilion-deep)", marginBottom: 14 }}>
          a controlled trial · five manuscripts
        </p>
        <h2
          style={{
            fontSize: "clamp(32px, 4.6vw, 54px)",
            fontWeight: 700,
            letterSpacing: "-0.025em",
            lineHeight: 1.06,
          }}
        >
          Professionals in their field
          <span style={{ color: "var(--ink-faint)", fontWeight: 400 }}> vs </span>
          RAAC&rsquo;s decentralizing council
        </h2>
        <p
          style={{
            marginTop: 18,
            fontSize: "clamp(16px, 1.5vw, 18.5px)",
            lineHeight: 1.7,
            color: "var(--ink-soft)",
            maxWidth: 720,
          }}
        >
          We asked professionals in their field for their reviews on{" "}
          <b style={{ color: "var(--ink)" }}>{manuscriptCount} selected manuscripts</b> — to see whether
          this model could be the stepping stone for the future of peer review.
        </p>
      </div>

      <Plate
        caption="The field, and the sitting"
        plateNo={`aggregate ${eff.scorePct}%`}
        style={{ marginTop: 36 }}
      >
        {/* ── Duel ── */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr auto 1fr",
            gap: "12px 20px",
            alignItems: "center",
          }}
          className="field-duel"
        >
          {/* The field — professionals */}
          <div style={{ textAlign: "center", minWidth: 0 }}>
            <div className="sc" style={{ fontSize: 12, color: "var(--ink-faint)", letterSpacing: "0.12em" }}>
              the field
            </div>
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                justifyContent: "center",
                gap: 6,
                marginTop: 14,
                minHeight: 88,
                alignContent: "center",
              }}
            >
              {Array.from({ length: professionalCount }).map((_, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 8 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.04 * i, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                >
                  <Bust fill="var(--ink)" size={30} opacity={0.22 + (i % 3) * 0.06} />
                </motion.div>
              ))}
            </div>
            <div style={{ marginTop: 12 }}>
              <span className="mono" style={{ fontSize: 28, fontWeight: 700, color: "var(--ink-soft)" }}>
                {professionalCount}
              </span>
              <span className="sc" style={{ marginLeft: 8, fontSize: 12, color: "var(--ink-faint)" }}>
                reviewers
              </span>
            </div>
            <div style={{ marginTop: 4, fontSize: 13.5, color: "var(--ink-faint)", fontStyle: "italic" }}>
              {maskCats} issue categories surfaced
            </div>
          </div>

          {/* VS mark */}
          <div
            aria-hidden
            style={{
              width: 52,
              height: 52,
              borderRadius: "50%",
              border: "1.5px solid var(--rule)",
              display: "grid",
              placeItems: "center",
              background: "var(--paper-raised)",
              boxShadow: "0 0 0 6px var(--paper)",
            }}
          >
            <span
              className="sc"
              style={{ fontSize: 13, fontWeight: 700, letterSpacing: "0.08em", color: "var(--vermilion-deep)" }}
            >
              vs
            </span>
          </div>

          {/* The sitting — RAAC council */}
          <div style={{ textAlign: "center", minWidth: 0 }}>
            <div className="sc" style={{ fontSize: 12, color: "var(--vermilion-deep)", letterSpacing: "0.12em" }}>
              the raac sitting
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                gap: 14,
                marginTop: 14,
                minHeight: 88,
                alignItems: "center",
              }}
            >
              {EXAMINER_INKS.map((ink, i) => (
                <motion.div
                  key={ink}
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.35 + i * 0.08, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                  style={{ position: "relative" }}
                >
                  <Bust fill={ink} size={44} />
                  <span
                    className="mono"
                    style={{
                      position: "absolute",
                      top: -4,
                      right: -6,
                      fontSize: 9,
                      color: ink,
                      fontWeight: 700,
                    }}
                  >
                    {ROMAN[i]}
                  </span>
                </motion.div>
              ))}
            </div>
            <div style={{ marginTop: 12 }}>
              <span className="mono" style={{ fontSize: 28, fontWeight: 700, color: "var(--ink)" }}>
                5
              </span>
              <span className="sc" style={{ marginLeft: 8, fontSize: 12, color: "var(--ink-faint)" }}>
                examiners · signed · hashed
              </span>
            </div>
            <div style={{ marginTop: 4, fontSize: 13.5, color: "var(--ink-soft)", fontStyle: "italic" }}>
              {liveCats} issue categories · +{lift}% breadth
            </div>
          </div>
        </div>

        {/* ── Scorebar ── */}
        <div
          style={{
            marginTop: 36,
            paddingTop: 26,
            borderTop: "1.5px solid var(--rule)",
            display: "grid",
            gridTemplateColumns: "minmax(140px, auto) 1fr minmax(120px, auto)",
            gap: 28,
            alignItems: "center",
          }}
          className="field-scorebar"
        >
          <div>
            <div
              style={{
                fontSize: "clamp(64px, 10vw, 104px)",
                fontWeight: 700,
                lineHeight: 0.92,
                letterSpacing: "-0.04em",
                color: "var(--ink)",
              }}
            >
              <CountUp value={eff.scorePct} duration={1.4} />
              <span style={{ fontSize: "0.45em", verticalAlign: "super", marginLeft: 2 }}>%</span>
            </div>
            <div className="sc" style={{ marginTop: 10, fontSize: 13, color: "var(--ink-soft)", maxWidth: 200, lineHeight: 1.45 }}>
              council effectiveness — weighted across five axes
            </div>
          </div>

          <div style={{ minWidth: 0 }}>
            {/* Axis bars — visual, not a spreadsheet */}
            <div style={{ display: "grid", gap: 10 }}>
              {eff.parts.map((p, i) => (
                <div key={p.key} style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) 48px", gap: 12, alignItems: "center" }}>
                  <div>
                    <div
                      style={{
                        fontSize: 12.5,
                        color: "var(--ink-soft)",
                        marginBottom: 4,
                        display: "flex",
                        justifyContent: "space-between",
                        gap: 8,
                      }}
                    >
                      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {p.label.replace(/ \(.*\)/, "")}
                      </span>
                      <span className="mono" style={{ fontSize: 10, color: "var(--ink-faint)", flexShrink: 0 }}>
                        w{p.weight}
                      </span>
                    </div>
                    <div style={{ height: 6, background: "var(--paper-sunk)", borderRadius: 3, overflow: "hidden" }}>
                      <motion.div
                        initial={{ width: 0 }}
                        whileInView={{ width: `${Math.round(p.value * 100)}%` }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.5 + i * 0.1, duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
                        style={{
                          height: "100%",
                          borderRadius: 3,
                          background: i < 2 ? "var(--ink)" : i === 2 ? "var(--sepia)" : "var(--emerald)",
                        }}
                      />
                    </div>
                  </div>
                  <span className="mono" style={{ fontSize: 13, fontWeight: 700, textAlign: "right" }}>
                    {p.points.toFixed(0)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div style={{ textAlign: "right" }}>
            <div className="sc" style={{ fontSize: 11, color: "var(--ink-faint)", letterSpacing: "0.1em" }}>
              against baseline
            </div>
            <div style={{ marginTop: 10, fontSize: 34, fontWeight: 700, lineHeight: 1, letterSpacing: "-0.02em" }}>
              +{lift}
              <span style={{ fontSize: 20 }}>%</span>
            </div>
            <div className="sc" style={{ marginTop: 6, fontSize: 11.5, color: "var(--ink-soft)", lineHeight: 1.4 }}>
              broader issue
              <br />
              coverage
            </div>
            <div style={{ marginTop: 16, fontSize: 34, fontWeight: 700, lineHeight: 1, letterSpacing: "-0.02em" }}>
              {liveCats}
              <span style={{ fontSize: 18, fontWeight: 600, color: "var(--ink-faint)" }}> / {unionCats}</span>
            </div>
            <div className="sc" style={{ marginTop: 6, fontSize: 11.5, color: "var(--ink-soft)", lineHeight: 1.4 }}>
              categories found
              <br />
              by the sitting
            </div>
          </div>
        </div>

        {/* ── Pitch foot ── */}
        <div
          style={{
            marginTop: 28,
            paddingTop: 18,
            borderTop: "1px solid var(--rule-soft)",
            display: "flex",
            flexWrap: "wrap",
            gap: 20,
            alignItems: "baseline",
            justifyContent: "space-between",
          }}
        >
          <p style={{ margin: 0, fontSize: 15.5, lineHeight: 1.7, color: "var(--ink-soft)", maxWidth: 640 }}>
            <b className="sc" style={{ color: "var(--ink)" }}>the question</b> — Can a reputation-ranked,
            author-signed council of five match the depth of working specialists, while every report is
            independent, attributable, and anchored on-chain? The trial says the model holds:{" "}
            <b style={{ color: "var(--ink)" }}>{eff.scorePct}% effectiveness</b> on the weighted aggregate —
            with {eff.tradeoffs.structuralRatePct}% of reports carrying three or more major issues.
          </p>
          <Link href="/comparison" className="btn-outline" style={{ flexShrink: 0 }}>
            Open the full plate →
          </Link>
        </div>

        {/* Fine print — one line, for the honest edge when presenting */}
        <p
          style={{
            marginTop: 16,
            fontSize: 12.5,
            lineHeight: 1.55,
            color: "var(--ink-faint)",
            maxWidth: 720,
          }}
        >
          Method: five niche arXiv manuscripts · {professionalCount} specialist reviews vs{" "}
          {manuscriptCount}×5 council reports · score = Σ axis×weight (coverage 40 · integrity 30 ·
          spread 12 · breadth 12 · plurality 6). Spread vs baseline σ {Math.round(eff.tradeoffs.scoreStdRatio * 100)}%
          · verdict entropy {Math.round(eff.tradeoffs.recommendationEntropyRatio * 100)}% — differences
          disclosed, not averaged away.{" "}
          <Link href="/comparison" className="link" style={{ color: "var(--vermilion-deep)" }}>
            methodology
          </Link>
        </p>
      </Plate>

      <style jsx global>{`
        @media (max-width: 720px) {
          .field-duel {
            grid-template-columns: 1fr !important;
            gap: 20px !important;
          }
          .field-duel > div:nth-child(2) {
            margin: 0 auto;
          }
          .field-scorebar {
            grid-template-columns: 1fr !important;
            gap: 22px !important;
          }
          .field-scorebar > div:last-child {
            text-align: left !important;
            display: flex;
            gap: 28px;
            flex-wrap: wrap;
          }
        }
      `}</style>
    </Reveal>
  );
}
