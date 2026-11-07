import { buildComparison } from "@/server/baseline/compare";

export const dynamic = "force-dynamic";

// Baseline comparison: persona-mask cohort vs live council cohort.
// Public — aggregated scores/categories only, no paper content.
export async function GET() {
  try {
    const data = await buildComparison();
    return Response.json({ ok: true, data });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return Response.json({ ok: false, error: { code: "INTERNAL", message: msg } }, { status: 500 });
  }
}
