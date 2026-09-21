import { createHash } from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "@/server/db/client";
import { papers, tenants } from "@/server/db/schema";
import { config } from "@/server/config";
import { emit } from "@/server/events/bus";

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

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null) as {
      title?: string; abstract?: string; domain?: string; keywords?: string[]; authorAddress?: string; feeTxHash?: string; feeAmountWei?: string; pdfUrl?: string;
    } | null;
    if (!body || !body.title || !body.abstract || !body.domain) {
      return Response.json({ ok: false, error: { code: "INVALID_REQUEST", message: "title, abstract, domain required" } }, { status: 400 });
    }
    const title = String(body.title).trim();
    const abstract = String(body.abstract).trim();
    const domain = String(body.domain).trim().toLowerCase();
    const keywords = Array.isArray(body.keywords) ? body.keywords.map((k) => String(k).trim()).filter(Boolean).slice(0, 8) : [];
    const authorAddress = body.authorAddress && /^0x[0-9a-fA-F]{40}$/.test(body.authorAddress) ? body.authorAddress : "0x000000000000000000000000000000000000dEaD";
    if (title.length < 5 || abstract.length < 20) {
      return Response.json({ ok: false, error: { code: "INVALID_REQUEST", message: "title >=5, abstract >=20" } }, { status: 400 });
    }
    const allowed = ["cryptography", "ml", "biology", "economics", "systems"];
    if (!allowed.includes(domain)) {
      return Response.json({ ok: false, error: { code: "INVALID_REQUEST", message: `domain must be one of ${allowed.join(", ")}` } }, { status: 400 });
    }
    const [tenant] = await db().select().from(tenants).where(eq(tenants.slug, config().DEMO_TENANT_SLUG));
    if (!tenant) return Response.json({ ok: false, error: { code: "INTERNAL", message: "demo tenant missing" } }, { status: 500 });

    const paperHash = createHash("sha256").update(`${title}|${abstract}|${Date.now()}`).digest("hex");
    const [paper] = await db()
      .insert(papers)
      .values({
        tenantId: tenant.id,
        authorAddress,
        title,
        abstract,
        domain,
        keywords,
        paperHash,
        pdfUrl: body.pdfUrl ? String(body.pdfUrl) : null,
        status: "submitted",
        feeTxHash: body.feeTxHash ? String(body.feeTxHash) : null,
        feeAmountWei: body.feeAmountWei ? String(body.feeAmountWei) : "1000000000000000",
      })
      .returning();

    await emit(
      {
        event_type: "paper.submitted",
        tenant_id: tenant.id,
        task_id: null,
        agent_id: null,
        payload: { paper_id: paper.id, tenant_id: tenant.id, author_address: authorAddress, paper_hash: paperHash, domain, fee_tx_hash: paper.feeTxHash ?? null },
      },
      { agent_key: "author:" + authorAddress.slice(0, 8), risk_class: "low" },
    );

    return Response.json({ ok: true, data: paper });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return Response.json({ ok: false, error: { code: "INTERNAL", message: msg } }, { status: 500 });
  }
}
