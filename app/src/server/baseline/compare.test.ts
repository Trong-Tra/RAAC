import { describe, expect, it } from "vitest";
import {
  computeEffectiveness,
  EFFECTIVENESS_WEIGHTS,
  loadMaskReviews,
  normalizedEntropy,
  statsOf,
  stdDev,
  type CohortStats,
  type NormalizedReview,
} from "./compare";

describe("normalizedEntropy", () => {
  it("is 0 for a single bucket", () => {
    expect(normalizedEntropy({ a: 10 })).toBe(0);
  });

  it("is 1 for uniform distribution", () => {
    expect(normalizedEntropy({ a: 5, b: 5, c: 5, d: 5 })).toBeCloseTo(1, 5);
  });

  it("is between 0 and 1 for skewed distributions", () => {
    const h = normalizedEntropy({ a: 8, b: 1, c: 1 });
    expect(h).toBeGreaterThan(0);
    expect(h).toBeLessThan(1);
  });
});

describe("stdDev", () => {
  it("is 0 for n<2", () => {
    expect(stdDev([5])).toBe(0);
  });

  it("matches sample stddev", () => {
    expect(stdDev([2, 4, 4, 4, 5, 5, 7, 9])).toBeCloseTo(2.138, 2);
  });
});

describe("statsOf", () => {
  it("returns null for empty", () => {
    expect(statsOf([])).toBeNull();
  });

  it("computes score spread and recommendation entropy", () => {
    const revs: NormalizedReview[] = [
      { source: "mask", paperId: "p", score: 3, recommendation: "Reject", categories: ["Novelty"] },
      { source: "mask", paperId: "p", score: 8, recommendation: "Minor Revision", categories: ["Evaluation rigor"] },
      { source: "mask", paperId: "p", score: 5, recommendation: "Major Revision", categories: ["Novelty", "Scope/clarity"] },
      { source: "mask", paperId: "p", score: 6, recommendation: "Major Revision", categories: ["Evaluation rigor"] },
    ];
    const s = statsOf(revs)!;
    expect(s.n).toBe(4);
    expect(s.scoreMin).toBe(3);
    expect(s.scoreMax).toBe(8);
    expect(s.scoreRange).toBe(5);
    expect(s.scoreStd).toBeGreaterThan(1);
    expect(s.recommendationCounts["Major Revision"]).toBe(2);
    expect(s.recommendationEntropy).toBeGreaterThan(0);
    expect(s.categoryDiversity).toBe(3);
  });
});

describe("loadMaskReviews", () => {
  it("loads 75 validated mask reviews from docs", () => {
    const all = loadMaskReviews();
    expect(all.length).toBe(75);
    expect(all.every((r) => r.source === "mask")).toBe(true);
    expect(all.every((r) => r.score >= 1 && r.score <= 10)).toBe(true);
    expect(all.every((r) => (r.categories?.length ?? 0) >= 3)).toBe(true);
    // five papers
    const papers = new Set(all.map((r) => r.paperId));
    expect(papers.size).toBe(5);
  });
});

describe("computeEffectiveness", () => {
  const baseStats = (over: Partial<CohortStats>): CohortStats => ({
    n: 25,
    scoreMean: 5,
    scoreStd: 1,
    scoreMin: 3,
    scoreMax: 8,
    scoreRange: 5,
    recommendationCounts: { "Major Revision": 20, "Minor Revision": 3, "Reject & Resubmit": 2 },
    recommendationEntropy: 0.7,
    categoryCounts: { novelty: 5, "evaluation rigor": 10, "scope/clarity": 8 },
    categoryDiversity: 3,
    meanConfidence: 7,
    ...over,
  });

  it("weights sum to 1", () => {
    const sum = Object.values(EFFECTIVENESS_WEIGHTS).reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(1, 5);
  });

  it("never returns 100% when diversity axes lag", () => {
    const mask = baseStats({ scoreStd: 1.2, categoryCounts: { a: 1, b: 1, c: 1, d: 1 }, categoryDiversity: 4, recommendationEntropy: 0.9 });
    const live = baseStats({ scoreStd: 0.85, categoryCounts: { a: 1, b: 1, c: 1, d: 1, e: 1, f: 1, g: 1 }, categoryDiversity: 7, recommendationEntropy: 0.4 });
    const eff = computeEffectiveness({ mask, live, fullJsonRate: 1, structuralRate: 0.88 });
    expect(eff.scorePct).toBeGreaterThanOrEqual(90);
    expect(eff.scorePct).toBeLessThan(100);
    expect(eff.tradeoffs.scoreStdRatio).toBeLessThan(1);
    expect(eff.parts).toHaveLength(5);
    const pointsSum = eff.parts.reduce((s, p) => s + p.points, 0);
    expect(Math.round(pointsSum)).toBe(eff.scorePct);
  });

  it("caps relative ratios at 1 when live matches or beats mask", () => {
    const mask = baseStats({ scoreStd: 1, categoryCounts: { a: 1 }, categoryDiversity: 1, recommendationEntropy: 0.5 });
    const live = baseStats({ scoreStd: 2, categoryCounts: { a: 1, b: 1, c: 1 }, categoryDiversity: 3, recommendationEntropy: 0.9 });
    const eff = computeEffectiveness({ mask, live, fullJsonRate: 1, structuralRate: 1 });
    const spread = eff.parts.find((p) => p.key === "scoreSpread")!;
    expect(spread.value).toBe(1);
    expect(eff.supporting.categoryLiftPct).toBe(200); // raw lift uncapped for disclosure
    expect(eff.parts.find((p) => p.key === "categoryBreadth")!.value).toBe(1); // capped for score
  });
});
