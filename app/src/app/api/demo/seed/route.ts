import { seed } from "@/server/demo/seed";

export const dynamic = "force-dynamic";

// Seeding is disabled: demo runs live on user-submitted papers only.
// Seeded papers risk accidental council runs against the limited
// OpenRouter free-tier quota. Re-enable by restoring the seed() call.
export async function POST() {
  void seed;
  return Response.json(
    { ok: false, error: { code: "GONE", message: "seeding disabled — submit papers live via POST /api/papers (arXiv)" } },
    { status: 410 },
  );
}
