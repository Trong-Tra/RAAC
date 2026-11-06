import { eq, inArray } from "drizzle-orm";
import { createHash } from "node:crypto";
import { config } from "../config";
import { logger } from "../logging";
import { db } from "../db/client";
import {
  tenants, agents, auditEvents, networkEvents,
  papers, paperCouncils, councilMessages, reviews, paperFees,
} from "../db/schema";

const withPseudonym = (agentKey: string) =>
  createHash("sha256").update(`${agentKey}|raac-network-v1`).digest("hex").slice(0, 16);

const fixture = {
  tenant: { slug: config().DEMO_TENANT_SLUG, name: "Blockchainist Lab" },
  agents: [{
    agent_key: "agent:8472", name: "systems-reviewer", environment: "demo",
    status: "active", erc8004_identity: "84532:9223",
    declared_capabilities: ["systems", "ml", "reproducibility", "review.paper"],
  }, {
    // REAL low-reputation identity — Base Agent0 agent 8453:74108 carries live
    // negative feedback (reputation ~0.10) and is excluded by the selector on
    // camera. Static fallback mirrors it as validation "failed".
    agent_key: "agent:lab-1", name: "low-rep-research-agent", environment: "demo",
    status: "active", erc8004_identity: "8453:74108",
    declared_capabilities: ["ml"],
  }, {
    // Owned Sepolia identities (registered live; feedback 90–95).
    agent_key: "agent:treasury", name: "theory-reviewer", environment: "demo",
    status: "active", erc8004_identity: "84532:9224",
    declared_capabilities: ["cryptography", "theory", "soundness", "review.paper"],
  }, {
    agent_key: "agent:reader", name: "reader-agent", environment: "demo",
    status: "active", erc8004_identity: "84532:9225",
    declared_capabilities: ["ml", "clarity", "evaluation", "review.paper"],
  }, {
    agent_key: "agent:crypto-rev", name: "crypto-reviewer", environment: "demo",
    status: "active", erc8004_identity: "84532:9226",
    declared_capabilities: ["cryptography", "zero-knowledge", "review.paper"],
  }, {
    agent_key: "agent:fairness", name: "fairness-reviewer", environment: "demo",
    status: "active", erc8004_identity: "84532:9227",
    declared_capabilities: ["cryptography", "fairness", "review.paper"],
  }],
} as const;

/** Ensure demo tenant + 6-agent roster exist. Does NOT touch papers/councils/reviews. */
export async function seedRoster(): Promise<{ agents: number }> {
  let [tenant] = await db().select().from(tenants).where(eq(tenants.slug, config().DEMO_TENANT_SLUG));
  if (!tenant) {
    await db().insert(tenants).values({ slug: fixture.tenant.slug, name: fixture.tenant.name }).onConflictDoNothing({ target: tenants.slug });
    [tenant] = await db().select().from(tenants).where(eq(tenants.slug, config().DEMO_TENANT_SLUG));
  }
  if (!tenant) throw new Error("seed: demo tenant missing");
  if (tenant.name !== fixture.tenant.name) {
    await db().update(tenants).set({ name: fixture.tenant.name }).where(eq(tenants.id, tenant.id));
    const [updated] = await db().select().from(tenants).where(eq(tenants.id, tenant.id));
    if (updated) tenant = updated;
  }

  const existing = await db().select().from(agents).where(eq(agents.tenantId, tenant.id));
  const have = new Set(existing.map((a) => a.agentKey));
  const missing = fixture.agents.filter((a) => !have.has(a.agent_key));
  if (missing.length) {
    await db().insert(agents).values(
      missing.map((a) => ({
        tenantId: tenant.id,
        agentKey: a.agent_key,
        erc8004Identity: a.erc8004_identity,
        name: a.name,
        environment: a.environment,
        status: a.status,
        declaredCapabilities: [...a.declared_capabilities],
      })),
    );
  }
  const count = (await db().select().from(agents).where(eq(agents.tenantId, tenant.id))).length;
  if (missing.length) logger("seed").info("roster topped up", { tenant: fixture.tenant.slug, added: missing.length, agents: count });
  return { agents: count };
}

export async function seed(): Promise<{ agents: number }> {
  let [tenant] = await db().select().from(tenants).where(eq(tenants.slug, config().DEMO_TENANT_SLUG));
  if (!tenant) {
    await db().insert(tenants).values({ slug: fixture.tenant.slug, name: fixture.tenant.name }).onConflictDoNothing({ target: tenants.slug });
    [tenant] = await db().select().from(tenants).where(eq(tenants.slug, config().DEMO_TENANT_SLUG));
  }
  if (!tenant) throw new Error("seed: demo tenant missing");
  if (tenant.name !== fixture.tenant.name) {
    await db().update(tenants).set({ name: fixture.tenant.name }).where(eq(tenants.id, tenant.id));
    const [updated] = await db().select().from(tenants).where(eq(tenants.id, tenant.id));
    if (updated) tenant = updated;
  }

  // RAAC cleanup: papers → councils → messages/reviews/fees (children first)
  // DESTRUCTIVE — demo reset only. Scripts that must preserve papers use seedRoster().
  const existingPapers = await db().select().from(papers).where(eq(papers.tenantId, tenant.id));
  const paperIds = existingPapers.map((p) => p.id);
  if (paperIds.length) {
    const existingCouncils = await db().select().from(paperCouncils).where(inArray(paperCouncils.paperId, paperIds));
    const councilIds = existingCouncils.map((c) => c.id);
    if (councilIds.length) {
      await db().delete(councilMessages).where(inArray(councilMessages.councilId, councilIds));
      await db().delete(reviews).where(inArray(reviews.councilId, councilIds));
      await db().delete(paperFees).where(inArray(paperFees.councilId, councilIds));
      await db().delete(paperCouncils).where(inArray(paperCouncils.id, councilIds));
    }
    await db().delete(paperFees).where(inArray(paperFees.paperId, paperIds));
    await db().delete(papers).where(inArray(papers.id, paperIds));
  }

  // Delete demo rows only, children first. Never TRUNCATE/never touch other tenants.
  const pseudonyms = fixture.agents.map((a) => withPseudonym(a.agent_key));
  await db().delete(auditEvents).where(eq(auditEvents.tenantId, tenant.id));
  await db().delete(agents).where(eq(agents.tenantId, tenant.id));
  await db().delete(networkEvents).where(inArray(networkEvents.agentPseudonym, pseudonyms));

  const agentRows = fixture.agents.map((a) => ({
    tenantId: tenant.id,
    agentKey: a.agent_key,
    erc8004Identity: a.erc8004_identity,
    name: a.name,
    environment: a.environment,
    status: a.status,
    declaredCapabilities: [...a.declared_capabilities],
  }));
  await db().insert(agents).values(agentRows);

  const counts = { agents: agentRows.length };
  logger("seed").info("demo tenant reseeded", { tenant: fixture.tenant.slug, ...counts });
  return counts;
}
