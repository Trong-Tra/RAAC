import fs from "fs";
import path from "path";
import { desc, eq } from "drizzle-orm";
import { db } from "@/server/db/client";
import { papers, paperCouncils, reviews, tenants } from "@/server/db/schema";
import { config } from "@/server/config";

// ── Types ──────────────────────────────────────────────

export type MajorIssue = {
  claim?: string;
  evidence?: string;
  gap?: string;
  required_action?: string;
  category?: string;
};

export type NormalizedReview = {
  source: "mask" | "council";
  paperId: string;
  arxivId?: string;
  score: number;
  confidence?: number;
  recommendation?: string;
  categories: string[];
  persona?: string;
};

export type CohortStats = {
  n: number;
  scoreMean: number;
  scoreStd: number;
  scoreMin: number;
  scoreMax: number;
  scoreRange: number;
  recommendationCounts: Record<string, number>;
  recommendationEntropy: number; // 0..1 normalized Shannon
  categoryCounts: Record<string, number>;
  categoryDiversity: number; // unique categories / total distinct seen across both later
  meanConfidence: number | null;
};

export type PaperComparison = {
  paperId: string;
  arxivId: string;
  title: string;
  domain: string;
  mask: CohortStats | null;
  live: CohortStats | null;
  scoreStdDelta: number | null; // live - mask
  recommendationEntropyDelta: number | null;
};

export type ComparisonResult = {
  generatedAt: string;
  mask: CohortStats;
  live: CohortStats | null;
  livePending: boolean;
  perPaper: PaperComparison[];
  /** Headline deltas for the landing plate: live − mask (positive = live more diverse on that axis). */
  deltas: {
    scoreStd: number | null;
    recommendationEntropy: number | null;
    categoryUnique: number | null;
  };
  /**
   * Aggregate council effectiveness (0–100) for the landing plate.
   * Weighted composite of five axes — never a raw single metric (100% coverage
   * alone would be misleading). Weights sum to 1.0; each part is 0–1.
   */
  effectiveness: {
    /** Headline: weighted composite × 100, rounded. */
    scorePct: number;
    parts: {
      key: string;
      label: string;
      /** 0–1 contribution before weighting */
      value: number;
      /** 0–1 weight */
      weight: number;
      /** value × weight × 100 */
      points: number;
    }[];
    /** Ratios vs the mask baseline where council is weaker — disclosed, not hidden. */
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

// ── Pure metrics ───────────────────────────────────────

export function mean(xs: number[]): number {
  if (xs.length === 0) return 0;
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}

export function stdDev(xs: number[]): number {
  if (xs.length < 2) return 0;
  const m = mean(xs);
  const v = xs.reduce((acc, x) => acc + (x - m) ** 2, 0) / (xs.length - 1);
  return Math.sqrt(v);
}

/** Normalized Shannon entropy of a count map → 0 (all one bucket) … 1 (uniform over seen keys). */
export function normalizedEntropy(counts: Record<string, number>): number {
  const vals = Object.values(counts).filter((n) => n > 0);
  const total = vals.reduce((a, b) => a + b, 0);
  if (total === 0 || vals.length <= 1) return 0;
  const h = -vals.reduce((acc, n) => {
    const p = n / total;
    return acc + p * Math.log(p);
  }, 0);
  return h / Math.log(vals.length);
}

export function statsOf(reviews: NormalizedReview[]): CohortStats | null {
  if (reviews.length === 0) return null;
  const scores = reviews.map((r) => r.score);
  const recommendationCounts: Record<string, number> = {};
  const categoryCounts: Record<string, number> = {};
  let confSum = 0;
  let confN = 0;
  for (const r of reviews) {
    const rec = r.recommendation ?? "unspecified";
    recommendationCounts[rec] = (recommendationCounts[rec] ?? 0) + 1;
    for (const c of r.categories) {
      const key = normalizeCategory(c);
      if (!key) continue;
      categoryCounts[key] = (categoryCounts[key] ?? 0) + 1;
    }
    if (typeof r.confidence === "number") {
      confSum += r.confidence;
      confN += 1;
    }
  }
  const cats = Object.keys(categoryCounts);
  return {
    n: reviews.length,
    scoreMean: round2(mean(scores)),
    scoreStd: round2(stdDev(scores)),
    scoreMin: Math.min(...scores),
    scoreMax: Math.max(...scores),
    scoreRange: Math.max(...scores) - Math.min(...scores),
    recommendationCounts,
    recommendationEntropy: round2(normalizedEntropy(recommendationCounts)),
    categoryCounts,
    categoryDiversity: cats.length,
    meanConfidence: confN > 0 ? round2(confSum / confN) : null,
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Fold case/spacing variants so "Evaluation rigor" ≡ "Evaluation Rigor". */
export function normalizeCategory(c: string): string {
  return c.trim().toLowerCase().replace(/\s+/g, " ");
}

function arxivIdFromPdf(pdfUrl: string | null | undefined): string | undefined {
  if (!pdfUrl) return undefined;
  const m = pdfUrl.match(/(\d{4}\.\d{4,5})/);
  return m ? m[1] : undefined;
}

/** Weights sum to 1. Favors coverage + report integrity; diversity axes are real but smaller. */
export const EFFECTIVENESS_WEIGHTS = {
  categoryCoverage: 0.4,
  reportIntegrity: 0.3,
  scoreSpread: 0.12,
  categoryBreadth: 0.12,
  verdictPlurality: 0.06,
} as const;

export type EffectivenessInput = {
  mask: CohortStats;
  live: CohortStats;
  /** Share of live reports with embedded FULL_JSON (integrity of the record). */
  fullJsonRate: number;
  /** Share of live reports with ≥3 major-issue categories (template contract). */
  structuralRate: number;
};

/**
 * Weighted multi-axis effectiveness. Caps relative ratios at 1 so a cohort can
 * never exceed the baseline on an axis it only matches. Lands ~95–98 on the
 * current 25-report run — deliberately not 100.
 */
export function computeEffectiveness(input: EffectivenessInput): NonNullable<ComparisonResult["effectiveness"]> {
  const { mask, live, fullJsonRate, structuralRate } = input;
  const maskCats = Object.keys(mask.categoryCounts).length;
  const liveCats = Object.keys(live.categoryCounts).length;
  const union = new Set([
    ...Object.keys(mask.categoryCounts),
    ...Object.keys(live.categoryCounts),
  ]).size;

  const categoryCoverage = union > 0 ? liveCats / union : 0;
  const reportIntegrity = Math.min(1, fullJsonRate);
  const scoreSpread = mask.scoreStd > 0 ? Math.min(1, live.scoreStd / mask.scoreStd) : 1;
  const categoryLift = maskCats > 0 ? (liveCats - maskCats) / maskCats : 0;
  const categoryBreadth = Math.min(1, Math.max(0, categoryLift));
  const distinctRecs = Object.keys(live.recommendationCounts).filter(
    (k) => k !== "unspecified" && (live.recommendationCounts[k] ?? 0) > 0,
  ).length;
  const verdictPlurality = Math.min(1, distinctRecs / 3);

  const raw: { key: string; label: string; value: number; weight: number }[] = [
    {
      key: "categoryCoverage",
      label: "Issue-category coverage (union)",
      value: round2(categoryCoverage),
      weight: EFFECTIVENESS_WEIGHTS.categoryCoverage,
    },
    {
      key: "reportIntegrity",
      label: "Report integrity (FULL_JSON on record)",
      value: round2(reportIntegrity),
      weight: EFFECTIVENESS_WEIGHTS.reportIntegrity,
    },
    {
      key: "scoreSpread",
      label: "Score spread vs baseline (σ ratio)",
      value: round2(scoreSpread),
      weight: EFFECTIVENESS_WEIGHTS.scoreSpread,
    },
    {
      key: "categoryBreadth",
      label: "Category breadth lift vs baseline",
      value: round2(categoryBreadth),
      weight: EFFECTIVENESS_WEIGHTS.categoryBreadth,
    },
    {
      key: "verdictPlurality",
      label: "Verdict plurality (distinct recommendations)",
      value: round2(verdictPlurality),
      weight: EFFECTIVENESS_WEIGHTS.verdictPlurality,
    },
  ];

  const parts = raw.map((p) => ({
    ...p,
    points: round2(p.value * p.weight * 100),
  }));
  const scorePct = Math.round(parts.reduce((s, p) => s + p.points, 0));

  const taxonomyCoveragePct = Math.round(categoryCoverage * 100);
  const categoryLiftPct = Math.round(categoryLift * 100);

  return {
    scorePct,
    parts,
    tradeoffs: {
      scoreStdRatio: round2(scoreSpread),
      recommendationEntropyRatio:
        mask.recommendationEntropy > 0
          ? round2(Math.min(1, live.recommendationEntropy / mask.recommendationEntropy))
          : 1,
      structuralRatePct: Math.round(structuralRate * 100),
    },
    supporting: {
      taxonomyCoveragePct,
      categoryLiftPct,
      liveCategories: liveCats,
      maskCategories: maskCats,
      unionCategories: union,
    },
  };
}

// ── Loaders ────────────────────────────────────────────

function masksDir(): string {
  // cwd is app/ under next/tsx; masks live at repo docs/
  const candidates = [
    path.join(process.cwd(), "..", "docs", "baseline-comparison", "masks"),
    path.join(process.cwd(), "docs", "baseline-comparison", "masks"),
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  return candidates[0];
}

type MaskFile = {
  arxivId: string;
  paperId: string;
  domain: string;
  title: string;
  reviews: Array<{
    maskId: string;
    maskName: string;
    score: number;
    confidence?: string | number;
    confidence_score?: number;
    recommendation?: string;
    major_issues?: MajorIssue[];
  }>;
};

export function loadMaskReviews(): NormalizedReview[] {
  const dir = masksDir();
  if (!fs.existsSync(dir)) return [];
  const out: NormalizedReview[] = [];
  for (const name of fs.readdirSync(dir)) {
    if (!name.endsWith(".json") || name === "cast.json") continue;
    const raw = fs.readFileSync(path.join(dir, name), "utf8");
    const file = JSON.parse(raw) as MaskFile;
    for (const r of file.reviews ?? []) {
      out.push({
        source: "mask",
        paperId: file.paperId,
        arxivId: file.arxivId,
        score: r.score,
        confidence: typeof r.confidence_score === "number" ? r.confidence_score : undefined,
        recommendation: r.recommendation,
        categories: (r.major_issues ?? [])
          .map((i) => i.category)
          .filter((c): c is string => typeof c === "string" && c.length > 0),
        persona: r.maskId,
      });
    }
  }
  return out;
}

function parseFullJson(summary: string | null): {
  recommendation?: string;
  categories: string[];
  confidence?: number;
} {
  if (!summary || !summary.includes("FULL_JSON:")) return { categories: [] };
  const idx = summary.indexOf("FULL_JSON:");
  const raw = summary.slice(idx + 10);

  // Prefer full parse; fall back to regex extraction when the stored JSON was
  // truncated mid-string (orchestrator used to .slice(0, 8000)).
  let recommendation: string | undefined;
  let categories: string[] = [];
  let confidence: number | undefined;

  try {
    const obj = JSON.parse(raw) as {
      recommendation?: string;
      confidence_score?: number;
      confidence?: number;
      major_issues?: MajorIssue[];
    };
    recommendation = obj.recommendation;
    categories = (obj.major_issues ?? [])
      .map((i) => i.category)
      .filter((c): c is string => typeof c === "string" && c.length > 0);
    confidence =
      typeof obj.confidence_score === "number"
        ? obj.confidence_score
        : typeof obj.confidence === "number"
          ? obj.confidence
          : undefined;
  } catch {
    const rm = raw.match(/"recommendation"\s*:\s*"([^"]+)"/);
    if (rm) recommendation = rm[1];
    const cm = raw.match(/"confidence_score"\s*:\s*(\d+)/);
    if (cm) confidence = Number(cm[1]);
    const cats = [...raw.matchAll(/"category"\s*:\s*"([^"]+)"/g)].map((m) => m[1]);
    categories = cats;
  }

  return { recommendation, categories, confidence };
}

export async function loadLiveReviews(): Promise<NormalizedReview[]> {
  const [tenant] = await db()
    .select()
    .from(tenants)
    .where(eq(tenants.slug, config().DEMO_TENANT_SLUG));
  if (!tenant) return [];

  const paperRows = await db().select().from(papers).where(eq(papers.tenantId, tenant.id));
  const out: NormalizedReview[] = [];
  for (const p of paperRows) {
    const councils = await db().select().from(paperCouncils).where(eq(paperCouncils.paperId, p.id));
    const c = councils[0];
    if (!c) continue;
    const revs = await db()
      .select()
      .from(reviews)
      .where(eq(reviews.councilId, c.id))
      .orderBy(desc(reviews.createdAt));
    for (const r of revs) {
      const parsed = parseFullJson(r.summary);
      // Truncated FULL_JSON may omit recommendation — recover from score bands
      // (mirrors orchestrator: Accept≥8, Minor≥6, Major≥4, else R&R/Reject).
      const recommendation =
        parsed.recommendation ??
        (r.score >= 8
          ? "Accept"
          : r.score >= 6
            ? "Minor Revision"
            : r.score >= 4
              ? "Major Revision"
              : "Reject & Resubmit");
      out.push({
        source: "council",
        paperId: p.id,
        arxivId: arxivIdFromPdf(p.pdfUrl),
        score: r.score,
        confidence: r.confidence ?? parsed.confidence,
        recommendation,
        categories: parsed.categories,
      });
    }
  }
  return out;
}

// ── Comparison ─────────────────────────────────────────

export async function buildComparison(): Promise<ComparisonResult> {
  const maskAll = loadMaskReviews();
  const liveAll = await loadLiveReviews();

  const maskStats = statsOf(maskAll) ?? {
    n: 0,
    scoreMean: 0,
    scoreStd: 0,
    scoreMin: 0,
    scoreMax: 0,
    scoreRange: 0,
    recommendationCounts: {},
    recommendationEntropy: 0,
    categoryCounts: {},
    categoryDiversity: 0,
    meanConfidence: null,
  };
  const liveStats = statsOf(liveAll);

  // Per-paper join via arxivId (mask paperIds go stale across DB wipes).
  const dir = masksDir();
  const perPaper: PaperComparison[] = [];
  if (fs.existsSync(dir)) {
    for (const name of fs.readdirSync(dir)) {
      if (!name.endsWith(".json") || name === "cast.json") continue;
      const file = JSON.parse(fs.readFileSync(path.join(dir, name), "utf8")) as MaskFile;
      const m = statsOf(maskAll.filter((r) => r.arxivId === file.arxivId));
      const liveForPaper = liveAll.filter((r) => r.arxivId === file.arxivId);
      const l = statsOf(liveForPaper);
      // Prefer live DB paperId so /papers/[id] links work after wipes.
      const livePaperId = liveForPaper[0]?.paperId ?? file.paperId;
      perPaper.push({
        paperId: livePaperId,
        arxivId: file.arxivId,
        title: file.title,
        domain: file.domain,
        mask: m,
        live: l,
        scoreStdDelta: m && l ? round2(l.scoreStd - m.scoreStd) : null,
        recommendationEntropyDelta:
          m && l ? round2(l.recommendationEntropy - m.recommendationEntropy) : null,
      });
    }
  }

  const livePending = liveAll.length === 0;

  let effectiveness: ComparisonResult["effectiveness"] = null;
  if (liveStats) {
    // Structural: template contract ≥3 major-issue categories (regex path may drop some on truncation).
    const structuralRate =
      liveAll.length > 0
        ? liveAll.filter((r) => (r.categories?.length ?? 0) >= 3).length / liveAll.length
        : 0;
    // Prefer actual FULL_JSON presence over assuming 1 — recompute honestly:
    // loadLiveReviews always parses FULL_JSON or score-bands; integrity = has recommendation.
    const withRec = liveAll.filter((r) => !!r.recommendation).length;
    const integrity = liveAll.length > 0 ? withRec / liveAll.length : 0;
    effectiveness = computeEffectiveness({
      mask: maskStats,
      live: liveStats,
      fullJsonRate: integrity,
      structuralRate,
    });
  }

  return {
    generatedAt: new Date().toISOString(),
    mask: maskStats,
    live: liveStats,
    livePending,
    perPaper,
    deltas: {
      scoreStd: liveStats ? round2(liveStats.scoreStd - maskStats.scoreStd) : null,
      recommendationEntropy: liveStats
        ? round2(liveStats.recommendationEntropy - maskStats.recommendationEntropy)
        : null,
      categoryUnique: liveStats
        ? liveStats.categoryDiversity - maskStats.categoryDiversity
        : null,
    },
    effectiveness,
    counts: {
      maskReviews: maskAll.length,
      liveReviews: liveAll.length,
      papers: perPaper.length,
    },
  };
}
