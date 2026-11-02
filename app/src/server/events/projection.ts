import { createHash } from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "../db/client";
import { agents, networkEvents } from "../db/schema";
import type { ProjectionMeta } from "./bus";
import type { EventEnvelope, EventType, RiskClass } from "./types";

// event_type → action_class for the public network projection.
export const ACTION_CLASS: Record<EventType, string> = {
  "paper.submitted": "paper",
  "agents.ranked": "ranking",
  "council.proposed": "council",
  "signature.verified": "council",
  "council.opened": "council",
  "discussion.message": "discussion",
  "review.submitted": "review",
  "paper.completed": "paper",
  "paper.failed": "paper",
};

export function outcomeFor(eventType: EventType, payload: Record<string, unknown>): string {
  switch (eventType) {
    case "paper.submitted":
      return "submitted";
    case "agents.ranked":
      return "ranked";
    case "council.proposed":
      return "proposed";
    case "signature.verified":
      return "verified";
    case "council.opened":
      return "opened";
    case "discussion.message":
      return "message";
    case "review.submitted":
      return "submitted";
    case "paper.completed":
      return String(payload.status);
    case "paper.failed":
      return String(payload.reason);
  }
}

export function pseudonymFor(agentKey: string): string {
  return createHash("sha256").update(`${agentKey}|raac-network-v1`).digest("hex").slice(0, 16);
}

export type NetworkRow = typeof networkEvents.$inferSelect;

// The public row shape served by all network routes.
export function publicShape(row: NetworkRow) {
  return {
    id: row.id,
    event_type: row.eventType,
    agent_pseudonym: row.agentPseudonym,
    agent_category: row.agentCategory,
    action_class: row.actionClass,
    outcome: row.outcome,
    risk_class: row.riskClass,
    created_at: row.createdAt,
  };
}

type Listener = (row: NetworkRow) => void;

const listeners = new Set<Listener>();

// In-process live tail for the SSE route. Same-process only (single Next
// server); subscribers must never throw into the emit path.
export function subscribeNetwork(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function broadcast(row: NetworkRow): void {
  for (const listener of listeners) {
    try {
      listener(row);
    } catch {
      // A broken subscriber must not break emission; SSE cleanup removes it.
    }
  }
}

// Runs inside emit(); writes the allowlist-only public row: never paper
// content, abstracts, transcripts, or tenant internals.
export async function projectEvent(
  envelope: EventEnvelope,
  meta: ProjectionMeta = {},
): Promise<NetworkRow | null> {
  const actionClass = ACTION_CLASS[envelope.event_type];
  if (!actionClass) return null;

  // agent_key = meta.agent_key → else agents row by envelope.agent_id → else skip.
  let agentKey = meta.agent_key;
  if (!agentKey && envelope.agent_id) {
    const [agent] = await db().select().from(agents).where(eq(agents.id, envelope.agent_id));
    agentKey = agent?.agentKey;
  }
  if (!agentKey) return null;

  const payload = envelope.payload as Record<string, unknown>;

  const [row] = await db()
    .insert(networkEvents)
    .values({
      eventType: envelope.event_type,
      agentPseudonym: pseudonymFor(agentKey),
      agentCategory: meta.category ?? "council",
      actionClass,
      outcome: outcomeFor(envelope.event_type, payload),
      riskClass: (meta.risk_class ?? "low") as RiskClass,
    })
    .returning();

  broadcast(row);
  return row;
}
