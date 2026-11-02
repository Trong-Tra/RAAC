import { desc, eq } from "drizzle-orm";
import { db } from "@/server/db/client";
import { papers, paperCouncils, tenants } from "@/server/db/schema";
import { config } from "@/server/config";
import { rankAgentsForPaper } from "@/server/selector";

export const dynamic = "force-dynamic";

// Latest paper + its live ranking — feeds the /network selection visual.
// Recomputes deterministically (no quota cost: Graph read or static fallback).
export async function GET() {
  try {
    const [tenant] = await db().select().from(tenants).where(eq(tenants.slug, config().DEMO_TENANT_SLUG));
    if (!tenant) return Response.json({ ok: true, data: { paper: null, council: null, scored: [], selectedKeys: [], hash: "", source: "" } });
    const [paper] = await db().select().from(papers).where(eq(papers.tenantId, tenant.id)).orderBy(desc(papers.createdAt)).limit(1);
    if (!paper) return Response.json({ ok: true, data: { paper: null, council: null, scored: [], selectedKeys: [], hash: "", source: "" } });

    const councils = await db().select().from(paperCouncils).where(eq(paperCouncils.paperId, paper.id));
    const { scored, selected, hash } = await rankAgentsForPaper(paper);
    return Response.json({
      ok: true,
      data: {
        paper: { id: paper.id, title: paper.title, domain: paper.domain, status: paper.status },
        council: councils[0] ? { status: councils[0].status } : null,
        scored,
        selectedKeys: selected.map((s) => s.agentKey),
        hash,
        source: config().AGENT0_SUBGRAPH_URL || config().THEGRAPH_API_KEY ? "graph" : "fallback",
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return Response.json({ ok: false, error: { code: "INTERNAL", message: msg } }, { status: 500 });
  }
}
