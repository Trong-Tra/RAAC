import { desc, eq } from "drizzle-orm";
import { db } from "@/server/db/client";
import { papers, paperCouncils, reviews, tenants } from "@/server/db/schema";
import { config } from "@/server/config";

export const dynamic = "force-dynamic";

// Public catalogue — all papers with council + review state.
// Feeds /catalogue: open to any reader, no wallet required.
export async function GET() {
  try {
    const [tenant] = await db().select().from(tenants).where(eq(tenants.slug, config().DEMO_TENANT_SLUG));
    if (!tenant) return Response.json({ ok: true, data: [] });
    const rows = await db().select().from(papers).where(eq(papers.tenantId, tenant.id)).orderBy(desc(papers.createdAt));
    const out = [];
    for (const p of rows) {
      const councils = await db().select().from(paperCouncils).where(eq(paperCouncils.paperId, p.id));
      const c = councils[0] ?? null;
      const revs = c ? await db().select().from(reviews).where(eq(reviews.councilId, c.id)) : [];
      out.push({
        id: p.id,
        title: p.title,
        domain: p.domain,
        status: p.status,
        createdAt: p.createdAt,
        paperHash: p.paperHash,
        council: c ? { status: c.status } : null,
        reviews: revs.map((r) => ({ score: r.score, anchored: !!r.anchorTxHash })),
      });
    }
    return Response.json({ ok: true, data: out });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return Response.json({ ok: false, error: { code: "INTERNAL", message: msg } }, { status: 500 });
  }
}
