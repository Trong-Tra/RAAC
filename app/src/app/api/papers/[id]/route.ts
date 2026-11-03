import { and, asc, eq } from "drizzle-orm";
import { db } from "@/server/db/client";
import { papers, tenants, paperCouncils, agents, reviews } from "@/server/db/schema";
import { config } from "@/server/config";
import { rankAgentsForPaper } from "@/server/selector";

export const dynamic = "force-dynamic";

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
      councilReviews = await db().select().from(reviews).where(eq(reviews.councilId, council.id)).orderBy(asc(reviews.createdAt));
    }

    const agentRows = await db().select().from(agents).where(eq(agents.tenantId, tenant.id));
    const { selected, hash, scored } = await rankAgentsForPaper(paper);
    const selection = selected.map((s) => ({
      agent_key: s.agentKey,
      name: s.name,
      erc8004: s.erc8004Identity ?? "",
      score: s.total,
      domainReviews: s.feedbackCount,
      validation: s.validation,
      exists: true,
      overallReputation: s.overallReputation,
      domainScore: s.domainScore,
    }));

    return Response.json({
      ok: true,
      data: {
        paper,
        council,
        selection, // live selector (Phase 3) — deterministic + Graph-backed
        scored,
        selectionHash: hash,
        reviews: councilReviews,
        agents: agentRows,
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return Response.json({ ok: false, error: { code: "INTERNAL", message: msg } }, { status: 500 });
  }
}
