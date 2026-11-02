import { and, eq } from "drizzle-orm";
import { createPublicClient, http } from "viem";
import { baseSepolia } from "viem/chains";
import { db } from "@/server/db/client";
import { papers, tenants, paperCouncils, agents } from "@/server/db/schema";
import { config } from "@/server/config";
import { verifyCouncilSignature } from "@/server/council/signature";
import { emit } from "@/server/events/bus";

export const dynamic = "force-dynamic";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let body: { signature?: string; author?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ ok: false, error: { code: "INVALID_REQUEST", message: "invalid json" } }, { status: 400 });
  }
  const signature = body.signature as `0x${string}` | undefined;
  const author = body.author as `0x${string}` | undefined;
  if (!signature || !author || !/^0x[0-9a-fA-F]{40}$/.test(author) || !/^0x[0-9a-fA-F]+$/.test(signature)) {
    return Response.json({ ok: false, error: { code: "INVALID_REQUEST", message: "signature and author (0x address) required" } }, { status: 400 });
  }

  try {
    const [tenant] = await db().select().from(tenants).where(eq(tenants.slug, config().DEMO_TENANT_SLUG));
    if (!tenant) return Response.json({ ok: false, error: { code: "INTERNAL", message: "demo tenant missing" } }, { status: 500 });
    const [paper] = await db().select().from(papers).where(and(eq(papers.id, id), eq(papers.tenantId, tenant.id)));
    if (!paper) return Response.json({ ok: false, error: { code: "TASK_NOT_FOUND", message: "paper not found" } }, { status: 404 });

    const [council] = await db().select().from(paperCouncils).where(eq(paperCouncils.paperId, paper.id));
    if (!council) return Response.json({ ok: false, error: { code: "TASK_NOT_FOUND", message: "no council proposed — POST /api/papers/[id]/selection first" } }, { status: 404 });
    if (council.status !== "proposed") {
      return Response.json({ ok: false, error: { code: "INVALID_REQUEST", message: `council already ${council.status}` } }, { status: 409 });
    }

    // Fee verify on Base Sepolia (if feeTxHash is real and not the demo zero hash)
    if (paper.feeTxHash && paper.feeTxHash !== "0x0000000000000000000000000000000000000000000000000000000000000000") {
      const rpc = config().BASE_SEPOLIA_RPC_URL ?? "https://sepolia.base.org";
      const client = createPublicClient({ chain: baseSepolia, transport: http(rpc) });
      try {
        const tx = await client.getTransaction({ hash: paper.feeTxHash as `0x${string}` });
        if (!tx) throw new Error("fee tx not found on Base Sepolia");
        // For MVP, any tx existence is enough — value check is optional (paper.feeAmountWei may be set)
      } catch (e) {
        return Response.json(
          { ok: false, error: { code: "INVALID_REQUEST", message: `fee tx not found on Base Sepolia (84532): ${e instanceof Error ? e.message : String(e)}` } },
          { status: 402 },
        );
      }
    }

    const ok = await verifyCouncilSignature({
      paperId: paper.id,
      paperHash: paper.paperHash,
      selectionHash: council.selectionHash,
      author,
      signature,
    });
    if (!ok) {
      return Response.json({ ok: false, error: { code: "INVALID_REQUEST", message: "signature verification failed on Base Sepolia domain (84532)" } }, { status: 401 });
    }

    const [updated] = await db()
      .update(paperCouncils)
      .set({ authorSignature: signature, status: "active", formedAt: new Date().toISOString() })
      .where(eq(paperCouncils.id, council.id))
      .returning();
    await db().update(papers).set({ status: "reviewing" }).where(eq(papers.id, paper.id));

    const [firstAgent] = await db().select().from(agents).where(eq(agents.agentKey, council.selectedAgentIds[0] as string));

    await emit(
      {
        event_type: "signature.verified",
        tenant_id: tenant.id,
        agent_id: firstAgent?.id ?? null,
        payload: { paper_id: paper.id, council_id: council.id, author_address: author },
      },
      { agent_key: council.selectedAgentIds[0] as string, risk_class: "low" },
    );
    await emit(
      {
        event_type: "council.opened",
        tenant_id: tenant.id,
        agent_id: firstAgent?.id ?? null,
        payload: { paper_id: paper.id, council_id: council.id, members: council.selectedAgentIds },
      },
      { agent_key: council.selectedAgentIds[0] as string, risk_class: "low" },
    );

    return Response.json({ ok: true, data: { council: updated, paper: { ...paper, status: "reviewing" } } });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return Response.json({ ok: false, error: { code: "INTERNAL", message: msg } }, { status: 500 });
  }
}
