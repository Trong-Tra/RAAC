import { describe, it, expect } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "../src/server/db/client";
import { tenants, agents, papers, paperCouncils, councilMessages, reviews } from "../src/server/db/schema";
import { config } from "../src/server/config";
import { rankAgentsForPaper } from "../src/server/selector";
import { verifyCouncilSignature } from "../src/server/council/signature";
import { runCouncil } from "../src/server/council/orchestrator";
import { seed } from "../src/server/demo/seed";
import { privateKeyToAccount } from "viem/accounts";
import { createHash } from "node:crypto";

describe("raac adversarial", () => {
  it("low-rep agent lab-1 (8453:74108) never in top 5", async () => {
    await seed();
    const [tenant] = await db().select().from(tenants).where(eq(tenants.slug, config().DEMO_TENANT_SLUG));
    const [paper] = await db().select().from(papers).where(eq(papers.tenantId, tenant.id));
    const { selected, scored } = await rankAgentsForPaper(paper);
    const lab1 = scored.find(s => s.agentKey === "agent:lab-1");
    expect(lab1).toBeDefined();
    expect(lab1!.validation).toBe("failed");
    expect(selected.map(s => s.agentKey)).not.toContain("agent:lab-1");
    expect(lab1!.total).toBeLessThan(0.3);
  }, 15000);
  it("unsigned council blocked — runCouncil requires active", async () => {
    await seed();
    const [tenant] = await db().select().from(tenants).where(eq(tenants.slug, config().DEMO_TENANT_SLUG));
    const [paper] = await db().select().from(papers).where(eq(papers.tenantId, tenant.id));
    const { selected, hash } = await rankAgentsForPaper(paper);
    const [council] = await db().insert(paperCouncils).values({
      paperId: paper.id, tenantId: tenant.id, status: "proposed",
      selectedAgentIds: selected.map(s=>s.agentKey), selectionScores: selected.map(s=>s.total), selectionHash: hash,
    }).returning();
    await expect(runCouncil(paper.id, tenant.id)).rejects.toThrow(/must be active/);
    await db().delete(councilMessages).where(eq(councilMessages.councilId, council.id));
    await db().delete(reviews).where(eq(reviews.councilId, council.id));
    await db().delete(paperCouncils).where(eq(paperCouncils.id, council.id));
  }, 15000);
  it("tampered EIP-712 signature rejected", async () => {
    await seed();
    const [tenant] = await db().select().from(tenants).where(eq(tenants.slug, config().DEMO_TENANT_SLUG));
    const [paper] = await db().select().from(papers).where(eq(papers.tenantId, tenant.id));
    const { hash } = await rankAgentsForPaper(paper);
    const key = process.env.BASE_SEPOLIA_PRIVATE_KEY as `0x${string}` | undefined;
    if (!key) {
      const bad = await verifyCouncilSignature({ paperId: paper.id, paperHash: paper.paperHash, selectionHash: hash, author: "0x000000000000000000000000000000000000dEaD", signature: "0xdead" as `0x${string}` });
      expect(bad).toBe(false); return;
    }
    const account = privateKeyToAccount(key);
    const sig = await account.signTypedData({
      domain:{ name:"RAAC", version:"1", chainId:84532, verifyingContract:"0x0000000000000000000000000000000000000000"},
      types:{ CouncilFormation:[{name:"paperId",type:"string"},{name:"paperHash",type:"string"},{name:"selectionHash",type:"string"},{name:"author",type:"address"}]},
      primaryType:"CouncilFormation",
      message:{ paperId: paper.id, paperHash: paper.paperHash, selectionHash: hash, author: account.address },
    });
    const tamperedHash = createHash("sha256").update("tamper").digest("hex");
    const bad = await verifyCouncilSignature({ paperId: paper.id, paperHash: paper.paperHash, selectionHash: tamperedHash, author: account.address, signature: sig });
    expect(bad).toBe(false);
  }, 15000);
});
