import { and, asc, eq } from "drizzle-orm";
import { db } from "@/server/db/client";
import { papers, tenants } from "@/server/db/schema";
import { config } from "@/server/config";
import { anchorReviewsForPaper, basescanTxUrl } from "@/server/anchors/base";

export const dynamic = "force-dynamic";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const [tenant] = await db().select().from(tenants).where(eq(tenants.slug, config().DEMO_TENANT_SLUG));
    if (!tenant) return Response.json({ ok: false, error: { code: "INTERNAL", message: "demo tenant missing" } }, { status: 500 });
    const [paper] = await db().select().from(papers).where(and(eq(papers.id, id), eq(papers.tenantId, tenant.id)));
    if (!paper) return Response.json({ ok: false, error: { code: "TASK_NOT_FOUND", message: "paper not found" } }, { status: 404 });

    const result = await anchorReviewsForPaper(paper.id, tenant.id);
    const txs = result.anchored.map((r) => ({ review_id: r.id, review_hash: r.reviewHash, anchor_tx: r.anchorTxHash!, url: basescanTxUrl(r.anchorTxHash!) }));
    return Response.json({ ok: true, data: { paper_id: paper.id, anchored: txs, already: result.already.length } });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const status = msg.includes("not set") ? 400 : msg.includes("no council") || msg.includes("no reviews") ? 404 : 500;
    return Response.json({ ok: false, error: { code: status === 400 ? "INVALID_REQUEST" : "INTERNAL", message: msg } }, { status });
  }
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const [tenant] = await db().select().from(tenants).where(eq(tenants.slug, config().DEMO_TENANT_SLUG));
    if (!tenant) return Response.json({ ok: false, error: { code: "INTERNAL", message: "demo tenant missing" } }, { status: 500 });
    const [paper] = await db().select().from(papers).where(and(eq(papers.id, id), eq(papers.tenantId, tenant.id)));
    if (!paper) return Response.json({ ok: false, error: { code: "TASK_NOT_FOUND", message: "paper not found" } }, { status: 404 });
    const { paperCouncils, reviews } = await import("@/server/db/schema");
    const [council] = await db().select().from(paperCouncils).where(eq(paperCouncils.paperId, paper.id));
    if (!council) return Response.json({ ok: true, data: { council: null, reviews: [] } });
    const revs = await db().select().from(reviews).where(eq(reviews.councilId, council.id)).orderBy(asc(reviews.createdAt));
    const withUrls = revs.map((r) => ({ ...r, basescan_url: r.anchorTxHash ? basescanTxUrl(r.anchorTxHash) : null }));
    return Response.json({ ok: true, data: { council, reviews: withUrls } });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return Response.json({ ok: false, error: { code: "INTERNAL", message: msg } }, { status: 500 });
  }
}
