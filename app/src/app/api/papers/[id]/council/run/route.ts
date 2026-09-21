import { and, eq } from "drizzle-orm";
import { db } from "@/server/db/client";
import { papers, tenants } from "@/server/db/schema";
import { config } from "@/server/config";
import { runCouncil } from "@/server/council/orchestrator";

export const dynamic = "force-dynamic";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const [tenant] = await db().select().from(tenants).where(eq(tenants.slug, config().DEMO_TENANT_SLUG));
    if (!tenant) return Response.json({ ok: false, error: { code: "INTERNAL", message: "demo tenant missing" } }, { status: 500 });
    const [paper] = await db().select().from(papers).where(and(eq(papers.id, id), eq(papers.tenantId, tenant.id)));
    if (!paper) return Response.json({ ok: false, error: { code: "TASK_NOT_FOUND", message: "paper not found" } }, { status: 404 });

    const result = await runCouncil(paper.id, tenant.id);
    return Response.json({ ok: true, data: result });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const status = msg.includes("must be active") ? 409 : msg.includes("no council") ? 404 : 500;
    return Response.json({ ok: false, error: { code: status === 409 ? "INVALID_REQUEST" : "INTERNAL", message: msg } }, { status });
  }
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const [tenant] = await db().select().from(tenants).where(eq(tenants.slug, config().DEMO_TENANT_SLUG));
    if (!tenant) return Response.json({ ok: false, error: { code: "INTERNAL", message: "demo tenant missing" } }, { status: 500 });
    const [paper] = await db().select().from(papers).where(and(eq(papers.id, id), eq(papers.tenantId, tenant.id)));
    if (!paper) return Response.json({ ok: false, error: { code: "TASK_NOT_FOUND", message: "paper not found" } }, { status: 404 });

    const { councilMessages, paperCouncils, reviews } = await import("@/server/db/schema");
    const [council] = await db().select().from(paperCouncils).where(eq(paperCouncils.paperId, paper.id));
    if (!council) return Response.json({ ok: true, data: { council: null, messages: [], reviews: [] } });
    const messages = await db().select().from(councilMessages).where(eq(councilMessages.councilId, council.id));
    const revs = await db().select().from(reviews).where(eq(reviews.councilId, council.id));
    return Response.json({ ok: true, data: { council, messages, reviews: revs } });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return Response.json({ ok: false, error: { code: "INTERNAL", message: msg } }, { status: 500 });
  }
}
