import { count, eq, sql } from "drizzle-orm";
import { db } from "@/server/db/client";
import { networkEvents, papers, paperCouncils, reviews, agents } from "@/server/db/schema";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [[observed], [papersCount], [councilsCount], [reviewsCount], [anchoredCount], [agentsCount]] = await Promise.all([
      db()
        .select({ value: sql<number>`count(distinct ${networkEvents.agentPseudonym})` })
        .from(networkEvents),
      db().select({ value: count() }).from(papers),
      db().select({ value: count() }).from(paperCouncils),
      db().select({ value: count() }).from(reviews),
      db().select({ value: count() }).from(reviews).where(eq(reviews.status, "anchored")),
      db().select({ value: count() }).from(agents),
    ]);

    return Response.json({
      ok: true,
      data: {
        agents_observed: Number(observed?.value ?? 0),
        papers_submitted: Number(papersCount?.value ?? 0),
        councils_formed: Number(councilsCount?.value ?? 0),
        reviews_submitted: Number(reviewsCount?.value ?? 0),
        reviews_anchored: Number(anchoredCount?.value ?? 0),
        agents_registered: Number(agentsCount?.value ?? 0),
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return Response.json(
      { ok: false, error: { code: "INTERNAL", message } },
      { status: 500 },
    );
  }
}
