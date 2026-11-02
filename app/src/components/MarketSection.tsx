"use client";

// Market / "why now" section — concentric outlined squares (the RAAC
// motif, not circles) for TAM → SAM → SOM, plus a ledger of real,
// sourced peer-review-collapse signals. TAM is analyst-anchored (link
// below); SAM/SOM are our estimates from public venue data and labeled
// as such.
//
// Selection is click/tap-to-lock on purpose: hover only previews a ring
// so the readout (and its source link) never changes under your cursor
// while you move toward it.
import { useEffect, useRef, useState } from "react";

// Values are millions of manuscripts per year.
const RINGS = [
  {
    tag: "TAM",
    value: 5.0,
    size: 380,
    base: "#2e2e2e",
    hot: "#8a8a8a",
    desc: "Peer-reviewed manuscripts published each year worldwide (~3–5M). Every one demands 2–3 unpaid expert reviews.",
    src: "STM Report",
    href: "https://www.stm-assoc.org/2018_10_04_STM_Report_2018.pdf",
  },
  {
    tag: "SAM",
    value: 0.12,
    size: 250,
    base: "#5a5a5a",
    hot: "#c9c9c9",
    desc: "AI/ML conference + arXiv cs.* submissions per year, spiking 60–70% YoY — ICLR alone went 19,525 valid submissions (2026) to ~50,000 abstracts (2027).",
    src: "The Decoder",
    href: "https://the-decoder.com/ai-conference-iclr-is-drowning-in-abstracts-with-roughly-50000-submissions-before-the-deadline/",
  },
  {
    tag: "SOM",
    value: 0.055,
    size: 130,
    base: "#8a8a8a",
    hot: "#f4f4f4",
    desc: "Top-tier AI venues in crisis (ICLR / NeurIPS / ICML): ~50–60k papers a year where reviewer disagreement rose 28% in one cycle. First wedge: pre-screen + triage councils.",
    src: "RAAC estimate",
    href: "#market",
  },
];

const LOSSES: { amount: string; what: string; href: string; src: string }[] = [
  {
    amount: "50,000",
    what: "Abstracts registered for ICLR 2027 before the deadline — nearly 3× ICLR 2026, reviewer pool unchanged.",
    href: "https://the-decoder.com/ai-conference-iclr-is-drowning-in-abstracts-with-roughly-50000-submissions-before-the-deadline/",
    src: "The Decoder",
  },
  {
    amount: "76,139",
    what: "Reviews produced by 18,054 volunteers for ICLR 2026's 19,525 submissions — 5,355 accepted.",
    href: "https://blog.iclr.cc/2026/03/31/a-retrospective-on-the-iclr-2026-review-process/",
    src: "ICLR",
  },
  {
    amount: "21%",
    what: "Of 75,800 ICLR 2026 reviews flagged fully AI-generated — over half showed some AI involvement.",
    href: "https://arxiv.org/html/2607.27183v1",
    src: "Pangram",
  },
  {
    amount: "45%",
    what: "Of submissions exposed in the November 2025 OpenReview breach — the anonymous-review illusion broken at scale.",
    href: "https://casrai.org/news/iclr-2026-openreview-breach-reviewer-bribery",
    src: "CASRAI",
  },
  {
    amount: "1 paper",
    what: "Max submission for authors without a qualifying publication — ICLR now throttles demand because review capacity broke.",
    href: "https://blog.iclr.cc/2026/03/31/a-retrospective-on-the-iclr-2026-review-process/",
    src: "ICLR",
  },
];

function useCountUp(target: number, run: boolean, key: string) {
  const [v, setV] = useState(0);
  useEffect(() => {
    if (!run) return;
    let raf = 0;
    const t0 = performance.now();
    const dur = 1100;
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / dur);
      setV(target * (1 - Math.pow(1 - p, 3)));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, run, key]);
  return v;
}

export default function MarketSection() {
  const [visible, setVisible] = useState(false);
  const [active, setActive] = useState("SOM");
  const [hovered, setHovered] = useState<string | null>(null);
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          io.disconnect();
        }
      },
      { rootMargin: "0px 0px -25% 0px", threshold: 0.1 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const ring = RINGS.find((r) => r.tag === active)!;
  const counted = useCountUp(ring.value, visible, active);
  const countedLabel =
    counted >= 1 ? `${counted.toFixed(1)}M` : `${Math.round(counted * 1000)}K`;

  return (
    <section
      id="market"
      ref={ref}
      className="section-pad"
      style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}
    >
      <p
        className="mono"
        style={{ fontSize: 11, letterSpacing: "0.2em", color: "#5a5a5a" }}
      >
        WHY NOW
      </p>

      <h2
        style={{
          marginTop: 18,
          fontSize: "clamp(34px, 4.5vw, 64px)",
          fontWeight: 700,
          letterSpacing: "-0.02em",
          lineHeight: 1.1,
          color: "#f4f4f4",
          maxWidth: 800,
        }}
      >
        Peer review is drowning in its own success.
      </h2>

      <div className="market-grid">
        <div>
          <svg
            viewBox="0 0 400 400"
            role="group"
            aria-label="TAM 5 million, SAM 120 thousand, SOM 55 thousand manuscripts per year. Select a square for detail."
            style={{ display: "block", width: "100%", height: "auto" }}
          >
            {RINGS.map((r, i) => {
              const o = (400 - r.size) / 2;
              const lit = r.tag === active || r.tag === hovered;
              return (
                <g
                  key={r.tag}
                  onMouseEnter={() => setHovered(r.tag)}
                  onMouseLeave={() => setHovered(null)}
                  onClick={() => setActive(r.tag)}
                  style={{ cursor: "pointer" }}
                >
                  {/* fat invisible hit area so thin strokes are easy to target */}
                  <rect
                    x={o - 12}
                    y={o - 12}
                    width={r.size + 24}
                    height={r.size + 24}
                    fill="transparent"
                  />
                  <rect
                    x={o}
                    y={o}
                    width={r.size}
                    height={r.size}
                    fill="none"
                    stroke={lit ? r.hot : r.base}
                    strokeWidth={r.tag === active ? 1.5 : 1}
                    pathLength={1}
                    strokeDasharray="1"
                    strokeDashoffset={visible ? 0 : 1}
                    style={{
                      transition: `stroke-dashoffset 1.1s ease ${i * 180}ms, stroke 0.2s ease`,
                      opacity: !visible ? 0 : lit ? 1 : 0.55,
                    }}
                  />
                  <text
                    x={o + 12}
                    y={o + 26}
                    fill={lit ? "#f4f4f4" : "#5a5a5a"}
                    fontSize="12"
                    letterSpacing="0.18em"
                    fontFamily="ui-monospace, Menlo, monospace"
                    style={{ transition: "fill 0.2s ease", pointerEvents: "none" }}
                  >
                    {r.tag}
                  </text>
                </g>
              );
            })}
          </svg>

          {/* readout — the legend, attached to the graphic */}
          <div
            key={active}
            className="ring-readout"
            style={{ marginTop: 8, borderTop: "1px solid rgba(255,255,255,0.1)", paddingTop: 20 }}
          >
            <div style={{ display: "flex", gap: 8 }}>
              {RINGS.map((r) => (
                <button
                  key={r.tag}
                  onClick={() => setActive(r.tag)}
                  className="mono"
                  style={{
                    cursor: "pointer",
                    fontSize: 10,
                    letterSpacing: "0.16em",
                    padding: "6px 12px",
                    border: "1px solid #3a3a3a",
                    background: r.tag === active ? "#e8e8e8" : "transparent",
                    color: r.tag === active ? "#000" : "#8a8a8a",
                  }}
                >
                  {r.tag}
                </button>
              ))}
            </div>
            <div
              className="mono"
              style={{
                marginTop: 14,
                fontSize: 34,
                color: "#f4f4f4",
                letterSpacing: "0.01em",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {countedLabel}
            </div>
            <p style={{ marginTop: 8, fontSize: 14.5, lineHeight: 1.6, color: "#8a8a8a" }}>
              {ring.desc}
            </p>
            <a
              href={ring.href}
              target={ring.href.startsWith("http") ? "_blank" : undefined}
              rel={ring.href.startsWith("http") ? "noreferrer" : undefined}
              className="link mono"
              style={{ fontSize: 11, letterSpacing: "0.08em" }}
            >
              SOURCE: {ring.src.toUpperCase()} ↗
            </a>
          </div>
        </div>

        <div>
          <p
            className="mono"
            style={{ fontSize: 11, letterSpacing: "0.2em", color: "#5a5a5a" }}
          >
            SIGNALS OF OVERLOAD — SOURCED
          </p>
          <div style={{ marginTop: 18, display: "grid" }}>
            {LOSSES.map((l, i) => (
              <a
                key={l.amount + l.src}
                href={l.href}
                target="_blank"
                rel="noreferrer"
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 20,
                  padding: "18px 0",
                  borderTop: "1px solid rgba(255,255,255,0.08)",
                  textDecoration: "none",
                  opacity: visible ? 1 : 0,
                  transform: visible ? "none" : "translateY(14px)",
                  transition: `opacity 0.5s ease ${300 + i * 110}ms, transform 0.5s ease ${300 + i * 110}ms`,
                }}
              >
                <span>
                  <span
                    className="mono"
                    style={{ fontSize: 19, color: "#f4f4f4", letterSpacing: "0.02em" }}
                  >
                    {l.amount}
                  </span>
                  <span
                    style={{
                      display: "block",
                      marginTop: 6,
                      fontSize: 14,
                      lineHeight: 1.55,
                      color: "#8a8a8a",
                    }}
                  >
                    {l.what}
                  </span>
                </span>
                <span
                  className="mono link"
                  style={{
                    fontSize: 10,
                    letterSpacing: "0.14em",
                    whiteSpace: "nowrap",
                    paddingTop: 4,
                  }}
                >
                  {l.src.toUpperCase()} ↗
                </span>
              </a>
            ))}
          </div>
          <p
            className="mono"
            style={{
              marginTop: 18,
              fontSize: 10,
              letterSpacing: "0.1em",
              lineHeight: 1.8,
              color: "#3f3f3f",
            }}
          >
            MANUSCRIPTS/YEAR. TAM: STM REPORT, LINKED. SAM/SOM: RAAC ESTIMATE
            FROM PUBLIC VENUE DATA. SIGNALS: PUBLICLY REPORTED, LINKED.
          </p>
        </div>
      </div>
    </section>
  );
}
