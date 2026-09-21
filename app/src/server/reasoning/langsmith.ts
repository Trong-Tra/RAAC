// Stub — LangSmith removed for RAAC (simpler API, no tracing).
// Keeps the `reasoning_ref` passthrough contract so existing callers still compile.
import type { NormalizedIntent } from "../domain";

export interface ReasoningRef {
  run_id: string;
  share_url: string | null;
  model?: string;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function extractReasoningRef(args: Record<string, unknown>): ReasoningRef | null {
  const raw = args.reasoning_ref;
  if (raw === null || raw === undefined) return null;
  if (typeof raw !== "object" || Array.isArray(raw)) return null;
  const { run_id, share_url, model } = raw as Record<string, unknown>;
  if (typeof run_id !== "string" || !UUID_RE.test(run_id)) return null;
  if (share_url !== null && share_url !== undefined) {
    if (typeof share_url !== "string" || share_url.length === 0 || !share_url.startsWith("https://")) return null;
  }
  if (model !== undefined && (typeof model !== "string" || model.length === 0 || model.length > 120)) return null;
  const ref: ReasoningRef = { run_id, share_url: typeof share_url === "string" ? share_url : null };
  if (typeof model === "string") ref.model = model;
  return ref;
}

export function langsmithProject(): string {
  return "raac-demo";
}

export async function traceAssistedNormalize(
  _input: { tool: string; args: Record<string, unknown>; taskId: string },
  base: NormalizedIntent,
): Promise<NormalizedIntent> {
  return base;
}
