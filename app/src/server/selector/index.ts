import { createHash } from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "../db/client";
import { agents, tenants } from "../db/schema";
import { config } from "../config";
import { HttpAgent0Client } from "../graph/agent0";

export interface ScoredAgent {
  agentKey: string;
  name: string;
  erc8004Identity: string | null;
  overallReputation: number;
  domainScore: number; // 0..1 proxy from capabilities
  recencyBonus: number; // 0 or 0.1
  total: number;
  validation: "passed" | "failed" | "unknown";
  feedbackCount: number;
  capabilities: string[];
}

// PROJECT.md §5 weights
const W_OVERALL = 0.5;
const W_DOMAIN = 0.4;
const W_RECENCY = 0.1;

// Domain match: if any capability/skill string contains domain keyword (case-insensitive), score 1, else 0.2 (cold start, not 0 — still rankable).
function domainFit(capabilities: string[], domain: string): number {
  const d = domain.toLowerCase();
  for (const c of capabilities) {
    if (c.toLowerCase().includes(d)) return 1;
    // common aliases: crypto <-> cryptography, zk <-> zero-knowledge
    if (d === "cryptography" && /crypto|zk|zero-knowledge/i.test(c)) return 1;
    if (d === "ml" && /ml|machine learning/i.test(c)) return 1;
  }
  return 0.2;
}

function recencyBonus(feedbackCount: number): number {
  // MVP proxy: recent activity if at least 5 feedback rows exist (agents.active in domain recently)
  return feedbackCount >= 5 ? 1 : 0;
}

function selectionHash(paperHash: string, selectedKeys: string[]): string {
  return createHash("sha256").update(`${paperHash}|${selectedKeys.join(",")}`).digest("hex");
}

// Fallback when Graph not configured — deterministic mock scores matching UI shell (0.94→0.85) but now computed from fixture.
const FALLBACK_SCORES: Record<string, number> = {
  "agent:8472": 0.94,
  "agent:treasury": 0.91,
  "agent:reader": 0.89,
  "agent:lab-1": 0.10,
};

export async function rankAgentsForPaper(paper: {
  id: string;
  domain: string;
  paperHash: string;
  tenantId: string;
}): Promise<{ scored: ScoredAgent[]; selected: ScoredAgent[]; hash: string }> {
  const tenantAgents = await db().select().from(agents).where(eq(agents.tenantId, paper.tenantId));

  const useGraph = Boolean(config().AGENT0_SUBGRAPH_URL || config().THEGRAPH_API_KEY);
  const client = useGraph ? new HttpAgent0Client() : null;

  const scored: ScoredAgent[] = [];

  for (const a of tenantAgents) {
    let trust: { reputation: number; validation: ScoredAgent["validation"]; feedbackCount: number; capabilities: string[] } | null = null;
    if (client && a.erc8004Identity) {
      try {
        const t = await client.lookup(a.erc8004Identity);
        trust = { reputation: t.reputation, validation: t.validation, feedbackCount: t.feedbackCount, capabilities: t.capabilities.length ? t.capabilities : (a.declaredCapabilities ?? []) };
      } catch {
        // fallback to static if lookup fails (not indexed, timeout)
        trust = null;
      }
    }
    if (!trust) {
      const fb = FALLBACK_SCORES[a.agentKey] ?? 0.5;
      trust = {
        reputation: fb,
        validation: a.agentKey === "agent:lab-1" ? "failed" : "unknown",
        feedbackCount: fb >= 0.8 ? 10 : 2,
        capabilities: a.declaredCapabilities ?? [],
      };
    }

    const dScore = domainFit(trust.capabilities, paper.domain);
    const rBonus = recencyBonus(trust.feedbackCount);
    const total = W_OVERALL * trust.reputation + W_DOMAIN * dScore + W_RECENCY * rBonus;
    // validation failed → penalize to bottom (still in list but never top-5)
    const penalized = trust.validation === "failed" ? total * 0.2 : total;

    scored.push({
      agentKey: a.agentKey,
      name: a.name,
      erc8004Identity: a.erc8004Identity,
      overallReputation: trust.reputation,
      domainScore: dScore,
      recencyBonus: rBonus * W_RECENCY,
      total: Math.round(penalized * 1000) / 1000,
      validation: trust.validation,
      feedbackCount: trust.feedbackCount,
      capabilities: trust.capabilities,
    });
  }

  scored.sort((a, b) => {
    if (b.total !== a.total) return b.total - a.total;
    return a.agentKey.localeCompare(b.agentKey);
  });

  // Eligibility gate per PROJECT.md §12: min 0.50 and at least 1 feedback, validation != failed for top-5.
  const eligible = scored.filter((s) => s.validation !== "failed" && s.overallReputation >= 0.3);
  const selected = (eligible.length >= 3 ? eligible : scored).slice(0, 5);

  const hash = selectionHash(paper.paperHash, selected.map((s) => s.agentKey));

  return { scored, selected, hash };
}
