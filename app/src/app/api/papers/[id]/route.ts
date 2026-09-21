import { and, eq } from "drizzle-orm";
import { db } from "@/server/db/client";
import { papers, tenants, paperCouncils, agents, reviews } from "@/server/db/schema";
import { config } from "@/server/config";

export const dynamic = "force-dynamic";

// Mock top-5 for UI shell — real selector (Phase 3) will replace this.
const MOCK_SELECTION = [
  { agent_key: "agent:8472", name: "crypto-reviewer", erc8004: "84532:9223", score: 0.94, domainReviews: 312, validation: "passed" },
  { agent_key: "agent:treasury", name: "zk-specialist", erc8004: "84532:9224", score: 0.91, domainReviews: 189, validation: "passed" },
  { agent_key: "agent:reader", name: "ml-reviewer", erc8004: "84532:9225", score: 0.89, domainReviews: 210, validation: "passed" },
  { agent_key: "agent:lab-1", name: "low-rep-research-agent", erc8004: "8453:74108", score: 0.10, domainReviews: 2, validation: "failed" },
  { agent_key: "agent:mock-5", name: "fairness-reviewer", erc8004: "84532:9226", score: 0.85, domainReviews: 98, validation: "passed" },
];

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const [tenant] = await db().select().from(tenants).where(eq(tenants.slug, config().DEMO_TENANT_SLUG));
    if (!tenant) return Response.json({ ok: false, error: { code: "INTERNAL", message: "demo tenant missing" } }, { status: 500 });

    const [paper] = await db()
      .select()
      .from(papers)
      .where(and(eq(papers.id, id), eq(papers.tenantId, tenant.id)));
    if (!paper) return Response.json({ ok: false, error: { code: "TASK_NOT_FOUND", message: "paper not found" } }, { status: 404 });

    const councils = await db().select().from(paperCouncils).where(eq(paperCouncils.paperId, paper.id));
    const council = councils[0] ?? null;

    let councilReviews: typeof reviews.$inferSelect[] = [];
    if (council) {
      councilReviews = await db().select().from(reviews).where(eq(reviews.councilId, council.id));
    }

    // Enrich selection with agent rows where available (for pseudonym etc.)
    const agentRows = await db().select().from(agents).where(eq(agents.tenantId, tenant.id));
    const byKey = new Map(agentRows.map((a) => [a.agentKey, a]));

    const selection = MOCK_SELECTION.slice(0, 5).map((s) => ({
      ...s,
      exists: byKey.has(s.agent_key),
    }));

    return Response.json({
      ok: true,
      data: {
        paper,
        council,
        selection, // mock top-5 explainable
        reviews: councilReviews,
        agents: agentRows,
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return Response.json({ ok: false, error: { code: "INTERNAL", message: msg } }, { status: 500 });
  }
}
