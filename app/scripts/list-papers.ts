import "../src/server/load-env";
import { eq } from "drizzle-orm";
import { db } from "../src/server/db/client";
import { papers } from "../src/server/db/schema";

async function main(): Promise<void> {
  const rows = await db().select().from(papers);
  for (const p of rows) {
    console.log(p.id, "|", p.status, "|", p.title.slice(0, 50));
  }
  const target = process.argv[2];
  if (target) {
    const { paperCouncils } = await import("../src/server/db/schema");
    await db().delete(paperCouncils).where(eq(paperCouncils.paperId, target));
    await db().delete(papers).where(eq(papers.id, target));
    console.log("deleted", target);
  }
}
main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
