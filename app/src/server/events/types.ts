import { z } from "zod";

export type RiskClass = "low" | "medium" | "high" | "critical";

const _eventTypes = [
  // RAAC paper lifecycle
  "paper.submitted", "agents.ranked", "council.proposed", "signature.verified",
  "council.opened", "discussion.message", "review.submitted", "paper.completed",
  "paper.failed",
] as const;
export type EventType = (typeof _eventTypes)[number];
export const eventTypes: [EventType, ...EventType[]] = [..._eventTypes];

const uuid = z.string().uuid();

export const payloadSchemas: Record<EventType, z.ZodTypeAny> = {
  "paper.submitted": z.object({ paper_id: uuid, tenant_id: uuid, author_address: z.string(), paper_hash: z.string(), domain: z.string(), fee_tx_hash: z.string().nullable().default(null) }),
  "agents.ranked": z.object({ paper_id: uuid, council_id: uuid, candidate_count: z.number().int(), selected_agent_ids: z.array(z.string()), scores: z.array(z.number()) }),
  "council.proposed": z.object({ paper_id: uuid, council_id: uuid, selection_hash: z.string() }),
  "signature.verified": z.object({ paper_id: uuid, council_id: uuid, author_address: z.string() }),
  "council.opened": z.object({ paper_id: uuid, council_id: uuid, members: z.array(z.string()) }),
  "discussion.message": z.object({ council_id: uuid, message_id: uuid, agent_id: z.string().nullable().default(null), content: z.string() }),
  "review.submitted": z.object({ paper_id: uuid, council_id: uuid, review_id: uuid, agent_id: z.string(), score: z.number().int(), review_hash: z.string() }),
  "paper.completed": z.object({ paper_id: uuid, council_id: uuid, review_ids: z.array(uuid), status: z.enum(["completed", "failed"]) }),
  "paper.failed": z.object({ paper_id: uuid, council_id: uuid.nullable().default(null), reason: z.string() }),
};

export const emitInput = z.object({
  event_type: z.enum(eventTypes),
  tenant_id: uuid,
  agent_id: uuid.nullable().default(null),
  payload: z.record(z.string(), z.unknown()),
});
export type EmitInput = z.input<typeof emitInput>;
export type EventEnvelope = z.output<typeof emitInput> & { event_id: string; occurred_at: string };
