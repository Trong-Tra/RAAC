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

function extractArxivId(url: string): string | null {
  const m = url.match(/(\d{4}\.\d{4,5})(v\d+)?/);
  return m ? m[1] : null;
}

function arxivCategoryToDomain(cats: string[]): string {
  const s = cats.join(" ").toLowerCase();
  if (/cs\.cr|crypto|quant-ph/.test(s)) return "cryptography";
  if (/cs\.cv|cs\.ro|systems/.test(s)) return "systems";
  if (/q-bio|biology/.test(s)) return "biology";
  if (/econ/.test(s)) return "economics";
  return "ml";
}

async function fetchArxiv(arxivUrl: string): Promise<{ title: string; abstract: string; categories: string[]; pdfUrl: string; arxivId: string }> {
  const id = extractArxivId(arxivUrl);
  if (!id) throw new Error("invalid arXiv URL or ID");
  const res = await fetch(`https://export.arxiv.org/api/query?id_list=${encodeURIComponent(id)}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`arXiv fetch failed ${res.status}`);
  const xml = await res.text();
  const titleMatch = xml.match(/<title[^>]*>([\s\S]*?)<\/title>/);
  const summaryMatch = xml.match(/<summary[^>]*>([\s\S]*?)<\/summary>/);
  const cats = [...xml.matchAll(/<category[^>]*term="([^"]+)"/g)].map((m) => m[1]);
  if (!titleMatch || !summaryMatch) throw new Error("arXiv parse failed");
  // first <title> is feed title, second is entry title — take second occurrence
  const titles = [...xml.matchAll(/<title[^>]*>([\s\S]*?)<\/title>/g)].map((m) => m[1].trim().replace(/\s+/g, " "));
  const summaries = [...xml.matchAll(/<summary[^>]*>([\s\S]*?)<\/summary>/g)].map((m) => m[1].trim().replace(/\s+/g, " "));
  const title = titles[1] ?? titles[0] ?? "";
  const abstract = summaries[0] ?? "";
  if (!title || !abstract) throw new Error("arXiv entry not found");
  return { title, abstract, categories: cats, pdfUrl: `https://arxiv.org/pdf/${id}`, arxivId: id };
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null) as {
      title?: string; abstract?: string; domain?: string; keywords?: string[]; authorAddress?: string; feeTxHash?: string; feeAmountWei?: string; pdfUrl?: string; arxivUrl?: string; arxiv_url?: string; url?: string;
    } | null;
    if (!body) return Response.json({ ok: false, error: { code: "INVALID_REQUEST", message: "invalid json" } }, { status: 400 });

    let title: string | undefined;
    let abstract: string | undefined;
    let domain: string | undefined;
    let keywords: string[] = [];
    let pdfUrl: string | null = null;
    let paperHash: string | undefined;

    const rawArxiv = (body.arxivUrl ?? body.arxiv_url ?? body.url ?? body.pdfUrl ?? "").trim();
    const hasArxiv = rawArxiv.includes("arxiv.org") || /^\d{4}\.\d{4,5}/.test(rawArxiv);

    if (hasArxiv) {
      const fetched = await fetchArxiv(rawArxiv);
      title = fetched.title;
      abstract = fetched.abstract;
      domain = arxivCategoryToDomain(fetched.categories);
      keywords = fetched.categories.slice(0, 8);
      pdfUrl = fetched.pdfUrl;
      paperHash = createHash("sha256").update(`arxiv:${fetched.arxivId}|${title}`).digest("hex");
    } else {
      if (!body.title || !body.abstract || !body.domain) {
        return Response.json({ ok: false, error: { code: "INVALID_REQUEST", message: "provide arxivUrl (https://arxiv.org/abs/...) or title+abstract+domain" } }, { status: 400 });
      }
      title = String(body.title).trim();
      abstract = String(body.abstract).trim();
      domain = String(body.domain).trim().toLowerCase();
      keywords = Array.isArray(body.keywords) ? body.keywords.map((k) => String(k).trim()).filter(Boolean).slice(0, 8) : [];
      pdfUrl = body.pdfUrl ? String(body.pdfUrl) : null;
      const allowed = ["cryptography", "ml", "biology", "economics", "systems"];
      if (!allowed.includes(domain)) {
        return Response.json({ ok: false, error: { code: "INVALID_REQUEST", message: `domain must be one of ${allowed.join(", ")}` } }, { status: 400 });
      }
      if (title.length < 5 || abstract.length < 20) {
        return Response.json({ ok: false, error: { code: "INVALID_REQUEST", message: "title >=5, abstract >=20" } }, { status: 400 });
      }
      paperHash = createHash("sha256").update(`${title}|${abstract}|${Date.now()}`).digest("hex");
    }

    const authorAddress = body?.authorAddress && /^0x[0-9a-fA-F]{40}$/.test(body.authorAddress) ? body.authorAddress : "0x000000000000000000000000000000000000dEaD";
    if (!title || !abstract || !domain || !paperHash) {
      return Response.json({ ok: false, error: { code: "INTERNAL", message: "paper parse failed" } }, { status: 500 });
    }
    const [tenant] = await db().select().from(tenants).where(eq(tenants.slug, config().DEMO_TENANT_SLUG));
    if (!tenant) return Response.json({ ok: false, error: { code: "INTERNAL", message: "demo tenant missing" } }, { status: 500 });

    const [paper] = await db()
      .insert(papers)
      .values({
        tenantId: tenant.id,
        authorAddress,
        title: title!,
        abstract: abstract!,
        domain: domain!,
        keywords,
        paperHash: paperHash!,
        pdfUrl,
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
