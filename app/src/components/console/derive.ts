import type { AuditEvent } from "@/lib/api";

export function parseTs(value: string | null | undefined): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function fmtTime(value: string | null | undefined): string {
  const d = parseTs(value);
  if (!d) return "—";
  return [d.getHours(), d.getMinutes(), d.getSeconds()]
    .map((v) => String(v).padStart(2, "0"))
    .join(":");
}

export function fmtDateTime(value: string | null | undefined): string {
  const d = parseTs(value);
  if (!d) return "—";
  return `${d.toISOString().slice(0, 10)} ${fmtTime(value)}`;
}

export function shortId(value: string | null | undefined, length = 8): string {
  if (!value) return "—";
  return value.length <= length ? value : value.slice(0, length);
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

export function eventSummary(event: AuditEvent): string {
  const payload = event.payload;
  switch (event.event_type) {
    case "paper.submitted":
      return `${asString(payload.domain) ?? "?"} · hash ${shortId(asString(payload.paper_hash), 10)}`;
    case "agents.ranked": {
      const n = payload.candidate_count;
      const sel = Array.isArray(payload.selected_agent_ids) ? payload.selected_agent_ids.length : 0;
      return `${typeof n === "number" ? n : "?"} candidates → top ${sel}`;
    }
    case "council.proposed":
      return `selection ${shortId(asString(payload.selection_hash), 10)}`;
    case "signature.verified":
      return `author ${shortId(asString(payload.author_address), 10)}`;
    case "council.opened": {
      const members = Array.isArray(payload.members) ? payload.members.length : 0;
      return `${members} members`;
    }
    case "discussion.message":
      return asString(payload.content)?.slice(0, 90) ?? "message";
    case "review.submitted": {
      const score = payload.score;
      return `score ${typeof score === "number" ? score : "?"}/10 · ${shortId(asString(payload.review_hash), 10)}`;
    }
    case "paper.completed":
      return asString(payload.status) ?? "completed";
    case "paper.failed":
      return asString(payload.reason) ?? "failed";
    default:
      return "";
  }
}
