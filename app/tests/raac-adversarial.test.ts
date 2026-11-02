import { describe, it, expect, afterAll } from "vitest";
import { eq } from "drizzle-orm";
import { createHash } from "node:crypto";
import { db } from "../src/server/db/client";
import { tenants, papers, paperCouncils, councilMessages, reviews } from "../src/server/db/schema";
import { config } from "../src/server/config";
import { rankAgentsForPaper } from "../src/server/selector";
import { verifyCouncilSignature } from "../src/server/council/signature";
import { runCouncil } from "../src/server/council/orchestrator";
import { seed } from "../src/server/demo/seed";
import { privateKeyToAccount } from "viem/accounts";

async function makePaper(tenantId: string) {
  const title = "Zero-knowledge proofs for federated inference";
  const [paper] = await db().insert(papers).values({
    tenantId,
    authorAddress: "0x000000000000000000000000000000000000dEaD",
    title,
    abstract: "We present a zero-knowledge proof system for verifying federated inference over heterogeneous models. Our construction achieves sublinear verification and preserves model privacy.",
    domain: "cryptography",
    keywords: ["zero-knowledge", "federated learning"],
    paperHash: createHash("sha256").update(`raac-test|${title}`).digest("hex"),
    status: "submitted",
  }).returning();
  return paper;
}

async function cleanupPaper(paperId: string) {
  const councils = await db().select().from(paperCouncils).where(eq(paperCouncils.paperId, paperId));
  for (const c of councils) {
    await db().delete(councilMessages).where(eq(councilMessages.councilId, c.id));
    await db().delete(reviews).where(eq(reviews.councilId, c.id));
    await db().delete(paperCouncils).where(eq(paperCouncils.id, c.id));
  }
  await db().delete(papers).where(eq(papers.id, paperId));
}

describe("raac adversarial", () => {
  afterAll(async () => {
    await seed(); // leave the demo tenant in its clean seeded state
  });

  it("low-rep agent lab-1 (8453:74108) never in top 5", async () => {
    await seed();
    const [tenant] = await db().select().from(tenants).where(eq(tenants.slug, config().DEMO_TENANT_SLUG));
    const paper = await makePaper(tenant.id);
    const { selected, scored } = await rankAgentsForPaper(paper);
    const lab1 = scored.find((s) => s.agentKey === "agent:lab-1");
    expect(lab1).toBeDefined();
    // Live Graph: validation may read "unknown" (no completed validation); the
    // exclusion must come from real on-chain reputation either way.
    expect(lab1!.overallReputation).toBeLessThan(0.3);
    expect(selected.map((s) => s.agentKey)).not.toContain("agent:lab-1");
    expect(lab1!.total).toBeLessThan(0.3);
    await cleanupPaper(paper.id);
  }, 15000);

  it("unsigned council blocked — runCouncil requires active", async () => {
    await seed();
    const [tenant] = await db().select().from(tenants).where(eq(tenants.slug, config().DEMO_TENANT_SLUG));
    const paper = await makePaper(tenant.id);
    const { selected, hash } = await rankAgentsForPaper(paper);
    const [council] = await db().insert(paperCouncils).values({
      paperId: paper.id, tenantId: tenant.id, status: "proposed",
      selectedAgentIds: selected.map((s) => s.agentKey), selectionScores: selected.map((s) => s.total), selectionHash: hash,
    }).returning();
    await expect(runCouncil(paper.id, tenant.id)).rejects.toThrow(/must be active/);
    await cleanupPaper(paper.id);
  }, 15000);

  it("tampered EIP-712 signature rejected", async () => {
    await seed();
    const [tenant] = await db().select().from(tenants).where(eq(tenants.slug, config().DEMO_TENANT_SLUG));
    const paper = await makePaper(tenant.id);
    const { hash } = await rankAgentsForPaper(paper);
    const key = process.env.BASE_SEPOLIA_PRIVATE_KEY as `0x${string}` | undefined;
    if (!key) {
      const bad = await verifyCouncilSignature({ paperId: paper.id, paperHash: paper.paperHash, selectionHash: hash, author: "0x000000000000000000000000000000000000dEaD", signature: "0xdead" as `0x${string}` });
      expect(bad).toBe(false);
      await cleanupPaper(paper.id);
      return;
    }
    const account = privateKeyToAccount(key);
    const sig = await account.signTypedData({
      domain: { name: "RAAC", version: "1", chainId: 84532, verifyingContract: "0x0000000000000000000000000000000000000000" },
      types: { CouncilFormation: [{ name: "paperId", type: "string" }, { name: "paperHash", type: "string" }, { name: "selectionHash", type: "string" }, { name: "author", type: "address" }] },
      primaryType: "CouncilFormation",
      message: { paperId: paper.id, paperHash: paper.paperHash, selectionHash: hash, author: account.address },
    });
    const tamperedHash = createHash("sha256").update("tamper").digest("hex");
    const bad = await verifyCouncilSignature({ paperId: paper.id, paperHash: paper.paperHash, selectionHash: tamperedHash, author: account.address, signature: sig });
    expect(bad).toBe(false);
    await cleanupPaper(paper.id);
  }, 15000);
});
