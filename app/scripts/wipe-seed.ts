// Wipe ALL seeded RAAC demo data for the demo tenant — papers, councils,
// messages, reviews, fees, and demo audit/network events. Keeps the tenant
// row + the 6 agent roster rows (the council roster; zero quota impact and
// required for future selection/run). Run: pnpm --filter app exec tsx scripts/wipe-seed.ts
import "../src/server/load-env";
import { createHash } from "node:crypto";
import { eq, inArray } from "drizzle-orm";
import { db } from "../src/server/db/client";
import { config } from "../src/server/config";
import {
  agents,
  auditEvents,
  councilMessages,
  networkEvents,
  paperCouncils,
  paperFees,
  papers,
  reviews,
  tenants,
} from "../src/server/db/schema";

const withPseudonym = (agentKey: string) =>
  createHash("sha256").update(`${agentKey}|cubic-network-v1`).digest("hex").slice(0, 16);

async function main(): Promise<void> {
  const [tenant] = await db().select().from(tenants).where(eq(tenants.slug, config().DEMO_TENANT_SLUG));
  if (!tenant) throw new Error("wipe-seed: demo tenant missing");

  const beforePapers = await db().select({ id: papers.id }).from(papers).where(eq(papers.tenantId, tenant.id));
  const beforeReviews = await db().select({ id: reviews.id }).from(reviews);

  // Children first: messages / reviews / fees → councils → papers
  const paperIds = beforePapers.map((p) => p.id);
  let councils = 0;
  let messages = 0;
  let revs = 0;
  if (paperIds.length) {
    const existingCouncils = await db().select().from(paperCouncils).where(inArray(paperCouncils.paperId, paperIds));
    const councilIds = existingCouncils.map((c) => c.id);
    councils = councilIds.length;
    if (councilIds.length) {
      const m = await db().delete(councilMessages).where(inArray(councilMessages.councilId, councilIds)).returning({ id: councilMessages.id });
      const r = await db().delete(reviews).where(inArray(reviews.councilId, councilIds)).returning({ id: reviews.id });
      await db().delete(paperFees).where(inArray(paperFees.councilId, councilIds));
      await db().delete(paperCouncils).where(inArray(paperCouncils.id, councilIds));
      messages = m.length;
      revs = r.length;
    }
    await db().delete(paperFees).where(inArray(paperFees.paperId, paperIds));
    await db().delete(papers).where(inArray(papers.id, paperIds));
  }

  // Demo audit trail + demo network events (by fixture pseudonyms only)
  const agentRows = await db().select().from(agents).where(eq(agents.tenantId, tenant.id));
  const pseudonyms = agentRows.map((a) => withPseudonym(a.agentKey));
  const aud = await db().delete(auditEvents).where(eq(auditEvents.tenantId, tenant.id)).returning({ id: auditEvents.id });
  let net = 0;
  if (pseudonyms.length) {
    const n = await db().delete(networkEvents).where(inArray(networkEvents.agentPseudonym, pseudonyms)).returning({ id: networkEvents.id });
    net = n.length;
  }

  const afterPapers = await db().select({ id: papers.id }).from(papers).where(eq(papers.tenantId, tenant.id));
  const keptAgents = await db().select({ key: agents.agentKey }).from(agents).where(eq(agents.tenantId, tenant.id));
  console.log(
    JSON.stringify(
      {
        tenant: tenant.slug,
        wiped: { papers: paperIds.length, councils, messages, reviews: revs, auditEvents: aud.length, networkEvents: net },
        before: { papers: beforePapers.length, reviews: beforeReviews.length },
        after: { papers: afterPapers.length },
        keptAgents: keptAgents.map((a) => a.key),
      },
      null,
      2,
    ),
  );
  process.exit(0);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
