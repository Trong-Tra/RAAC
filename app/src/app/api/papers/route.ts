import { eq } from "drizzle-orm";
import { db } from "@/server/db/client";
import { papers, tenants } from "@/server/db/schema";
import { config } from "@/server/config";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [tenant] = await db().select().from(tenants).where(eq(tenants.slug, config().DEMO_TENANT_SLUG));
    if (!tenant) return Response.json({ ok: true, data: [] });
    const rows = await db().select().from(papers).where(eq(papers.tenantId, tenant.id));
    // newest first
    rows.sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""));
    return Response.json({ ok: true, data: rows });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return Response.json({ ok: false, error: { code: "INTERNAL", message: msg } }, { status: 500 });
  }
}
