import { and, eq } from "drizzle-orm";
import { db } from "@/server/db/client";
import { papers, tenants, paperCouncils, agents } from "@/server/db/schema";
import { config } from "@/server/config";
import { rankAgentsForPaper } from "@/server/selector";
import { emit } from "@/server/events/bus";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const [tenant] = await db().select().from(tenants).where(eq(tenants.slug, config().DEMO_TENANT_SLUG));
    if (!tenant) return Response.json({ ok: false, error: { code: "INTERNAL", message: "demo tenant missing" } }, { status: 500 });
    const [paper] = await db().select().from(papers).where(and(eq(papers.id, id), eq(papers.tenantId, tenant.id)));
    if (!paper) return Response.json({ ok: false, error: { code: "TASK_NOT_FOUND", message: "paper not found" } }, { status: 404 });

    const { scored, selected, hash } = await rankAgentsForPaper(paper);
    const councils = await db().select().from(paperCouncils).where(eq(paperCouncils.paperId, paper.id));
    const council = councils[0] ?? null;

    return Response.json({
      ok: true,
      data: { paper, scored, selected, hash, council, source: config().AGENT0_SUBGRAPH_URL || config().THEGRAPH_API_KEY ? "graph" : "fallback" },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return Response.json({ ok: false, error: { code: "INTERNAL", message: msg } }, { status: 500 });
  }
}

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const [tenant] = await db().select().from(tenants).where(eq(tenants.slug, config().DEMO_TENANT_SLUG));
    if (!tenant) return Response.json({ ok: false, error: { code: "INTERNAL", message: "demo tenant missing" } }, { status: 500 });
    const [paper] = await db().select().from(papers).where(and(eq(papers.id, id), eq(papers.tenantId, tenant.id)));
    if (!paper) return Response.json({ ok: false, error: { code: "TASK_NOT_FOUND", message: "paper not found" } }, { status: 404 });

    const { scored, selected, hash } = await rankAgentsForPaper(paper);

    const existing = await db().select().from(paperCouncils).where(eq(paperCouncils.paperId, paper.id));
    let council = existing[0];
    if (!council) {
      const [inserted] = await db()
        .insert(paperCouncils)
        .values({
          paperId: paper.id,
          tenantId: tenant.id,
          status: "proposed",
          selectedAgentIds: selected.map((s) => s.agentKey),
          selectionScores: selected.map((s) => s.total),
          selectionHash: hash,
        })
        .returning();
      council = inserted;
      await db().update(papers).set({ status: "council_proposed" }).where(eq(papers.id, paper.id));

      const [firstAgent] = await db().select().from(agents).where(eq(agents.agentKey, selected[0].agentKey));

      await emit(
        {
          event_type: "agents.ranked",
          tenant_id: tenant.id,
          task_id: null,
          agent_id: firstAgent?.id ?? null,
          payload: {
            paper_id: paper.id,
            council_id: council.id,
            candidate_count: scored.length,
            selected_agent_ids: selected.map((s) => s.agentKey),
            scores: selected.map((s) => s.total),
          },
        },
        { agent_key: selected[0].agentKey, risk_class: "low", category: "ranking" as unknown as string },
      );
      await emit(
        {
          event_type: "council.proposed",
          tenant_id: tenant.id,
          task_id: null,
          agent_id: firstAgent?.id ?? null,
          payload: {
            paper_id: paper.id,
            council_id: council.id,
            selection_hash: hash,
          },
        },
        { agent_key: selected[0].agentKey, risk_class: "low" },
      );
    }

    return Response.json({ ok: true, data: { paper, scored, selected, hash, council } });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return Response.json({ ok: false, error: { code: "INTERNAL", message: msg } }, { status: 500 });
  }
}
