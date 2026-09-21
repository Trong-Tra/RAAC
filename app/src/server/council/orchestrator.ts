import { createHash } from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "../db/client";
import { agents, councilMessages, papers, paperCouncils, reviews } from "../db/schema";
import { emit } from "../events/bus";

function reviewHash(paperHash: string, agentKey: string, score: number, summary: string): string {
  return createHash("sha256").update(`${paperHash}|${agentKey}|${score}|${summary}`).digest("hex");
}

// Deterministic mock discussion per agent (so demo is reproducible). Real agents will call via MCP/A2A later.
const DISCUSSION_TEMPLATES: Record<string, string[]> = {
  "agent:8472": ["The proof's sublinear claim checks, but federated heterogeneity lacks imbalance ablations."],
  "agent:reader": ["CIFAR-10 is fine; add a language-model benchmark with longer contexts."],
  "agent:treasury": ["Section 4.2 aggregation needs a soundness proof for heterogeneous models."],
  "agent:crypto-rev": ["Verification is 12× faster — need to confirm it holds under malicious aggregator."],
  "agent:fairness": ["Fairness of partitioned inference not evaluated — add demographic slice."],
  "agent:lab-1": ["Novelty is incremental; comparison to prior ZK-federated work thin."],
};

const REVIEW_TEMPLATES: Record<string, { score: number; confidence: number; summary: string; strengths: string; weaknesses: string; questions: string }> = {
  "agent:8472": { score: 7, confidence: 8, summary: "Solid ZK construction with meaningful speed-up; experiments need stronger heterogeneity stress.", strengths: "Sublinear verifier; privacy preserved; 12× speed-up.", weaknesses: "Missing imbalance ablations; Section 4.2 proof gap.", questions: "Does 12× hold with 100+ parties and non-IID 90/10 splits?" },
  "agent:reader": { score: 8, confidence: 7, summary: "Clear contribution; evaluation is credible but narrow.", strengths: "Clean benchmark; clear writing.", weaknesses: "Only CIFAR-10; no long-context LM test.", questions: "Add WikiText-103 federated inference?" },
  "agent:treasury": { score: 6, confidence: 7, summary: "Aggregation soundness not fully justified.", strengths: "Novel federated ZK framing.", weaknesses: "Section 4.2 missing proof; trust assumption on aggregator.", questions: "Formalize aggregator threat model." },
  "agent:crypto-rev": { score: 8, confidence: 9, summary: "Verification speed is the core win — holds under honest-but-curious aggregator.", strengths: "12× with proof; sublinear.", weaknesses: "Malicious aggregator not analyzed.", questions: "Prove soundness against malicious aggregation." },
  "agent:fairness": { score: 6, confidence: 6, summary: "Fails to evaluate fairness across shards.", strengths: "Privacy framing.", weaknesses: "No demographic or fairness slice.", questions: "Slice accuracy by shard demographics." },
  "agent:lab-1": { score: 5, confidence: 5, summary: "Incremental over prior ZK-federated; thin delta.", strengths: "Baseline comparison.", weaknesses: "Limited novelty; weak related work.", questions: "Differentiate vs. [16]?" },
};

export async function runCouncil(paperId: string, tenantId: string) {
  const [paper] = await db().select().from(papers).where(eq(papers.id, paperId));
  if (!paper) throw new Error("paper not found");
  const [council] = await db().select().from(paperCouncils).where(eq(paperCouncils.paperId, paperId));
  if (!council) throw new Error("no council");
  if (council.status !== "active") throw new Error(`council must be active to run, got ${council.status}`);

  const selectedKeys = council.selectedAgentIds as string[];
  // Prevent double-run: if reviews already exist, return them
  const existing = await db().select().from(reviews).where(eq(reviews.councilId, council.id));
  if (existing.length > 0) return { council, messages: await db().select().from(councilMessages).where(eq(councilMessages.councilId, council.id)), reviews: existing };

  // 1) Discussion: one message per selected agent (deterministic)
  const agentRows = await db().select().from(agents).where(eq(agents.tenantId, tenantId));
  const byKey = new Map(agentRows.map((a) => [a.agentKey, a.id]));
  const messages: typeof councilMessages.$inferSelect[] = [];
  for (const key of selectedKeys) {
    const agentId = byKey.get(key) ?? null;
    const templates = DISCUSSION_TEMPLATES[key] ?? ["No comment — review to follow."];
    for (const content of templates) {
      const [msg] = await db().insert(councilMessages).values({ councilId: council.id, agentId, authorType: "agent", content }).returning();
      messages.push(msg);
      // emit discussion.message (non-blocking for MVP)
      const t = agentRows.find((a) => a.agentKey === key);
      await emit(
        {
          event_type: "discussion.message",
          tenant_id: tenantId,
          task_id: null,
          agent_id: t?.id ?? null,
          payload: { council_id: council.id, message_id: msg.id, agent_id: key, content },
        },
        { agent_key: key, risk_class: "low" },
      );
    }
  }

  // 2) Reviews: one per selected agent, deterministic hash
  const created: typeof reviews.$inferSelect[] = [];
  for (const key of selectedKeys) {
    const agentId = byKey.get(key);
    if (!agentId) continue;
    const tmpl = REVIEW_TEMPLATES[key] ?? { score: 6, confidence: 6, summary: "Mock review.", strengths: "—", weaknesses: "—", questions: "—" };
    const hash = reviewHash(paper.paperHash, key, tmpl.score, tmpl.summary);
    const [rev] = await db()
      .insert(reviews)
      .values({
        councilId: council.id,
        paperId: paper.id,
        agentId,
        score: tmpl.score,
        confidence: tmpl.confidence,
        summary: tmpl.summary,
        strengths: tmpl.strengths,
        weaknesses: tmpl.weaknesses,
        questions: tmpl.questions,
        reviewHash: hash,
        status: "submitted",
      })
      .returning();
    created.push(rev);
    const t = agentRows.find((a) => a.agentKey === key);
    await emit(
      {
        event_type: "review.submitted",
        tenant_id: tenantId,
        task_id: null,
        agent_id: t?.id ?? null,
        payload: { paper_id: paper.id, council_id: council.id, review_id: rev.id, agent_id: key, score: tmpl.score, review_hash: hash },
      },
      { agent_key: key, risk_class: "low" },
    );
  }

  // 3) Mark council + paper completed (no fee release tx yet — Phase 6 anchoring will add anchorTxHash)
  await db().update(paperCouncils).set({ status: "completed", completedAt: new Date().toISOString() }).where(eq(paperCouncils.id, council.id));
  await db().update(papers).set({ status: "completed" }).where(eq(papers.id, paper.id));

  const [firstAgent] = await db().select().from(agents).where(eq(agents.agentKey, selectedKeys[0]));
  await emit(
    {
      event_type: "paper.completed",
      tenant_id: tenantId,
      task_id: null,
      agent_id: firstAgent?.id ?? null,
      payload: { paper_id: paper.id, council_id: council.id, review_ids: created.map((r) => r.id), status: "completed" },
    },
    { agent_key: selectedKeys[0], risk_class: "low" },
  );

  const [updatedCouncil] = await db().select().from(paperCouncils).where(eq(paperCouncils.id, council.id));
  return { council: updatedCouncil, messages, reviews: created };
}
