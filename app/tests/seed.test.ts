import { describe, expect, it } from "vitest";
import { count, eq } from "drizzle-orm";
import { db } from "../src/server/db/client";
import { agents, papers, tenants } from "../src/server/db/schema";
import { seed } from "../src/server/demo/seed";

describe("seed", () => {
  it("seeds demo tenant with the 6-agent reviewer roster and no papers", async () => {
    const counts = await seed();
    expect(counts.agents).toBe(6);

    const [tenant] = await db().select().from(tenants).where(eq(tenants.slug, "demo"));
    expect(tenant).toBeDefined();

    const [agentCount] = await db().select({ value: count() }).from(agents).where(eq(agents.tenantId, tenant.id));
    expect(Number(agentCount.value)).toBe(6);

    const [paperCount] = await db().select({ value: count() }).from(papers).where(eq(papers.tenantId, tenant.id));
    expect(Number(paperCount.value)).toBe(0);
  }, 20000);
});
