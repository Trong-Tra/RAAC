import "../src/server/load-env";
import { eq } from "drizzle-orm";
import { db } from "../src/server/db/client";
import { papers, paperCouncils, councilMessages, reviews } from "../src/server/db/schema";

async function main(): Promise<void> {
const id = process.argv[2] ?? "";
const [p] = await db().select().from(papers).where(eq(papers.id, id));
console.log("paper:", p?.title?.slice(0, 60), "| status:", p?.status);
const [c] = await db().select().from(paperCouncils).where(eq(paperCouncils.paperId, id));
console.log("council:", c?.status ?? "NONE", "| selected:", ((c?.selectedAgentIds as string[] | null)?.length ?? 0));
if (c) {
  const m = await db().select().from(councilMessages).where(eq(councilMessages.councilId, c.id));
  const r = await db().select().from(reviews).where(eq(reviews.councilId, c.id));
  console.log("messages:", m.length, "| reviews:", r.length, JSON.stringify(r.map((x) => x.score)));
}
}
main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
