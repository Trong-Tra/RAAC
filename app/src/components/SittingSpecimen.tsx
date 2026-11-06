"use client";

import { useEffect, useState } from "react";
import Plate from "@/components/Plate";

const INKS = ["var(--ultramarine)", "var(--emerald)", "var(--madder)", "var(--sepia)", "var(--violet)"];
const ROMAN = ["i", "ii", "iii", "iv", "v"];

const EXAMINERS = [
  { name: "systems-reviewer", line: "the multi-head ablation is convincing; training cost is honestly reported.", score: 8, verdict: "minor revision" },
  { name: "reader-agent", line: "strong baselines, though the WMT comparisons deserve one more row.", score: 7, verdict: "minor revision" },
  { name: "crypto-reviewer", line: "the claims of generality outrun the evidence in §5.", score: 6, verdict: "major revision" },
  { name: "theory-reviewer", line: "the complexity argument is sound; the constants are swept under the rug.", score: 8, verdict: "minor revision" },
  { name: "fairness-reviewer", line: "no word on evaluation bias across low-resource languages.", score: 6, verdict: "major revision" },
];

const MEDIAN = 7;

/**
 * SittingSpecimen — the hero plate: a council sitting in miniature.
 * Five examiner inks write their marginalia one character at a time,
 * a verdict stamps in beside each, then the median rule is drawn and
 * the sitting reconvenes. Clearly labelled a specimen.
 */
export default function SittingSpecimen() {
  const [examinerIdx, setExaminerIdx] = useState(0);
  const [chars, setChars] = useState(0);
  const [holding, setHolding] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setExaminerIdx(EXAMINERS.length);
      setHolding(true);
      return;
    }
    if (holding) {
      const t = setTimeout(() => {
        setExaminerIdx(0);
        setChars(0);
        setHolding(false);
      }, 3600);
      return () => clearTimeout(t);
    }
    const current = EXAMINERS[examinerIdx];
    if (!current) {
      const t = setTimeout(() => setHolding(true), 700);
      return () => clearTimeout(t);
    }
    if (chars < current.line.length) {
      const t = setTimeout(() => setChars((c) => c + 1), 14);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => {
      setExaminerIdx((i) => i + 1);
      setChars(0);
    }, 480);
    return () => clearTimeout(t);
  }, [examinerIdx, chars, holding]);

  return (
    <Plate caption="A sitting, abridged" plateNo="specimen">
      <div style={{ minHeight: 296, display: "flex", flexDirection: "column" }}>
        {EXAMINERS.map((e, i) => {
          const active = i === examinerIdx && !holding;
          const written = i < examinerIdx || holding;
          if (!written && !active) return null;
          const text = written ? e.line : e.line.slice(0, chars);
          return (
            <div key={e.name} style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "7px 0", borderTop: i === 0 ? "none" : "1px solid var(--rule-faint)" }}>
              <div style={{ minWidth: 0, fontSize: 13.5, lineHeight: 1.5 }}>
                <span className="mono" style={{ fontSize: 10.5, color: INKS[i], marginRight: 7 }}>{ROMAN[i]}.</span>
                <b style={{ fontWeight: 600 }}>{e.name}</b>{" "}
                <span style={{ fontStyle: "italic", color: "var(--ink-soft)" }}>
                  {text}
                  {active && <span aria-hidden style={{ display: "inline-block", width: 7, height: 13, marginLeft: 2, verticalAlign: "-2px", background: INKS[i], animation: "blink 1.1s infinite" }} />}
                </span>
              </div>
              {written && (
                <span className="sc flap-in" style={{ fontSize: 12, fontWeight: 700, color: INKS[i], whiteSpace: "nowrap", alignSelf: "center" }}>
                  {e.score} · {e.verdict}
                </span>
              )}
            </div>
          );
        })}
        <div style={{ flex: 1 }} />
        {(holding || examinerIdx >= EXAMINERS.length) && (
          <p className="flap-in" style={{ marginTop: 10, paddingTop: 12, borderTop: "1.5px solid var(--rule)", fontSize: 14, color: "var(--ink-soft)" }}>
            Five reports, independently written. Median{" "}
            <span style={{ fontSize: 26, fontWeight: 700, color: "var(--ink)", lineHeight: 1 }}>{MEDIAN}</span>
            /10 — <span className="sc" style={{ fontWeight: 700, color: "var(--vermilion-deep)" }}>minor revision</span>.
          </p>
        )}
      </div>
    </Plate>
  );
}
