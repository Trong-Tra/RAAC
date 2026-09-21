import { sql } from "drizzle-orm";
import {
  pgTable, uuid, text, integer, jsonb, timestamp, bigserial,
  check, index, uniqueIndex,
} from "drizzle-orm/pg-core";
import type { Reason, NormalizedIntent } from "../domain";

const ts = (name: string) => timestamp(name, { withTimezone: true, mode: "string" });

export const tenants = pgTable("tenants", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull(),
  name: text("name").notNull(),
  createdAt: ts("created_at").notNull().defaultNow(),
}, (t) => [uniqueIndex("tenants_slug_key").on(t.slug)]);

export const agents = pgTable("agents", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id),
  agentKey: text("agent_key").notNull(),
  erc8004Identity: text("erc8004_identity"),
  name: text("name").notNull(),
  environment: text("environment").notNull().default("demo"),
  status: text("status").notNull().default("active"),
  declaredCapabilities: jsonb("declared_capabilities").$type<string[]>().notNull().default(sql`'[]'::jsonb`),
  createdAt: ts("created_at").notNull().defaultNow(),
}, (t) => [
  uniqueIndex("agents_tenant_key").on(t.tenantId, t.agentKey),
  check("agents_status_check", sql`${t.status} in ('active','suspended')`),
]);

export const tools = pgTable("tools", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id),
  name: text("name").notNull(),
  category: text("category").notNull(),
  defaultRiskClass: text("default_risk_class").notNull(),
  executor: text("executor").notNull(),
  executorConfig: jsonb("executor_config").$type<Record<string, unknown>>().notNull().default(sql`'{}'::jsonb`),
  createdAt: ts("created_at").notNull().defaultNow(),
}, (t) => [
  uniqueIndex("tools_tenant_name").on(t.tenantId, t.name),
  check("tools_risk_check", sql`${t.defaultRiskClass} in ('low','medium','high','critical')`),
]);

export const policies = pgTable("policies", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id),
  name: text("name").notNull(),
  version: integer("version").notNull().default(1),
  rules: jsonb("rules").$type<unknown[]>().notNull().default(sql`'[]'::jsonb`),
  createdAt: ts("created_at").notNull().defaultNow(),
}, (t) => [uniqueIndex("policies_tenant_name_version").on(t.tenantId, t.name, t.version)]);

export const tasks = pgTable("tasks", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id),
  agentId: uuid("agent_id").notNull().references(() => agents.id),
  title: text("title").notNull(),
  budgetUsdCents: integer("budget_usd_cents"),
  status: text("status").notNull().default("open"),
  createdAt: ts("created_at").notNull().defaultNow(),
}, (t) => [check("tasks_status_check", sql`${t.status} in ('open','completed','failed')`)]);

export const intents = pgTable("intents", {
  id: uuid("id").primaryKey().defaultRandom(),
  taskId: uuid("task_id").references(() => tasks.id),
  agentId: uuid("agent_id").notNull().references(() => agents.id),
  tool: text("tool").notNull(),
  resource: text("resource"),
  argumentsRedacted: jsonb("arguments_redacted").$type<Record<string, unknown>>().notNull().default(sql`'{}'::jsonb`),
  riskClass: text("risk_class").notNull(),
  origin: text("origin").notNull().default("agent"),
  normalized: jsonb("normalized").$type<NormalizedIntent | null>(),
  createdAt: ts("created_at").notNull().defaultNow(),
}, (t) => [
  index("intents_task_idx").on(t.taskId, t.createdAt),
  check("intents_risk_check", sql`${t.riskClass} in ('low','medium','high','critical')`),
]);

export const decisions = pgTable("decisions", {
  id: uuid("id").primaryKey().defaultRandom(),
  intentId: uuid("intent_id").notNull().references(() => intents.id),
  decision: text("decision").notNull(),
  matchedPolicy: text("matched_policy").notNull(),
  matchedRuleId: text("matched_rule_id").notNull(),
  reasons: jsonb("reasons").$type<Reason[]>().notNull().default(sql`'[]'::jsonb`),
  contextSnapshotHash: text("context_snapshot_hash").notNull(),
  riskScore: integer("risk_score").notNull(),
  createdAt: ts("created_at").notNull().defaultNow(),
}, (t) => [check("decisions_decision_check", sql`${t.decision} in ('allow','deny','escalate')`)]);

export const capabilities = pgTable("capabilities", {
  id: uuid("id").primaryKey().defaultRandom(),
  decisionId: uuid("decision_id").notNull().references(() => decisions.id),
  subject: text("subject").notNull(),
  action: text("action").notNull(),
  resource: text("resource").notNull(),
  constraints: jsonb("constraints").$type<Record<string, unknown>>().notNull().default(sql`'{}'::jsonb`),
  budgetUsdCents: integer("budget_usd_cents"),
  expiresAt: ts("expires_at").notNull(),
  nonce: text("nonce").notNull(),
  policyHash: text("policy_hash").notNull(),
  status: text("status").notNull().default("issued"),
  issuedAt: ts("issued_at").notNull().defaultNow(),
  consumedAt: ts("consumed_at"),
}, (t) => [
  uniqueIndex("capabilities_nonce_key").on(t.nonce),
  check("capabilities_status_check", sql`${t.status} in ('issued','consumed','expired','revoked')`),
]);

export const approvals = pgTable("approvals", {
  id: uuid("id").primaryKey().defaultRandom(),
  decisionId: uuid("decision_id").notNull().references(() => decisions.id),
  type: text("type").notNull(),
  status: text("status").notNull().default("pending"),
  provider: text("provider").notNull(),
  providerRef: text("provider_ref"),
  requestedAt: ts("requested_at").notNull().defaultNow(),
  completedAt: ts("completed_at"),
  // Council multisig (off-chain, Gnosis-Safe-compatible semantics, no
  // contract): the council name required by the matched rule (null = single
  // resolver) + collected member signatures [{signer, signature}].
  council: text("council"),
  signatures: jsonb("signatures").$type<Array<{ signer: string; signature: string }>>().notNull().default([]),
}, (t) => [
  check("approvals_type_check", sql`${t.type} in ('ledger','human')`),
  check("approvals_status_check", sql`${t.status} in ('pending','approved','rejected')`),
]);

// Approval councils: named M-of-N member sets. Members are wallet addresses;
// the demo seeds treasury-council (2-of-2) + deploy-council (1-of-1).
// Safe integration is a display hook only (safe_address, unlinked).
export const councils = pgTable("councils", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id),
  name: text("name").notNull(),
  members: jsonb("members").$type<string[]>().notNull().default([]),
  threshold: integer("threshold").notNull().default(1),
  safeAddress: text("safe_address"),
}, (t) => [
  uniqueIndex("councils_tenant_name").on(t.tenantId, t.name),
]);

export const executions = pgTable("executions", {
  id: uuid("id").primaryKey().defaultRandom(),
  capabilityId: uuid("capability_id").notNull().references(() => capabilities.id),
  tool: text("tool").notNull(),
  status: text("status").notNull().default("running"),
  executor: text("executor").notNull(),
  resultSummary: text("result_summary"),
  error: text("error"),
  startedAt: ts("started_at").notNull().defaultNow(),
  completedAt: ts("completed_at"),
}, (t) => [check("executions_status_check", sql`${t.status} in ('running','succeeded','failed')`)]);

export const payments = pgTable("payments", {
  id: uuid("id").primaryKey().defaultRandom(),
  capabilityId: uuid("capability_id").notNull().references(() => capabilities.id),
  service: text("service").notNull(),
  network: text("network").notNull(),
  amountUsdCents: integer("amount_usd_cents").notNull(),
  status: text("status").notNull().default("requested"),
  x402Ref: text("x402_ref"),
  createdAt: ts("created_at").notNull().defaultNow(),
  settledAt: ts("settled_at"),
}, (t) => [check("payments_status_check", sql`${t.status} in ('requested','completed','failed')`)]);

export const auditEvents = pgTable("audit_events", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  tenantId: uuid("tenant_id").references(() => tenants.id),
  taskId: uuid("task_id").references(() => tasks.id),
  agentId: uuid("agent_id").references(() => agents.id),
  eventType: text("event_type").notNull(),
  payload: jsonb("payload").$type<Record<string, unknown>>().notNull(),
  createdAt: ts("created_at").notNull().defaultNow(),
}, (t) => [index("audit_events_task_idx").on(t.taskId, t.createdAt)]);

export const networkEvents = pgTable("network_events", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  eventType: text("event_type").notNull(),
  agentPseudonym: text("agent_pseudonym").notNull(),
  agentCategory: text("agent_category").notNull(),
  actionClass: text("action_class").notNull(),
  outcome: text("outcome").notNull(),
  riskClass: text("risk_class").notNull(),
  createdAt: ts("created_at").notNull().defaultNow(),
}, (t) => [index("network_events_created_idx").on(t.createdAt)]);

// ── RAAC: papers → councils → reviews (Phase 1) ──
// Existing `tasks`/`councils`/`payments`/`approvals` tables stay for Cubic compat
// during migration. New tables are paper-centric and Base Sepolia only.

export const papers = pgTable("papers", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id),
  authorAddress: text("author_address").notNull(),
  title: text("title").notNull(),
  abstract: text("abstract").notNull(),
  domain: text("domain").notNull(),
  keywords: jsonb("keywords").$type<string[]>().notNull().default(sql`'[]'::jsonb`),
  paperHash: text("paper_hash").notNull(), // sha256 of off-chain PDF
  pdfUrl: text("pdf_url"),
  status: text("status").notNull().default("submitted"),
  feeTxHash: text("fee_tx_hash"),
  feeAmountWei: text("fee_amount_wei"),
  createdAt: ts("created_at").notNull().defaultNow(),
}, (t) => [
  index("papers_tenant_idx").on(t.tenantId, t.createdAt),
  index("papers_domain_idx").on(t.domain),
  check("papers_status_check", sql`${t.status} in ('submitted','council_proposed','pending_signature','reviewing','completed','failed')`),
]);

export const paperCouncils = pgTable("paper_councils", {
  id: uuid("id").primaryKey().defaultRandom(),
  paperId: uuid("paper_id").notNull().references(() => papers.id),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id),
  status: text("status").notNull().default("proposed"),
  selectedAgentIds: jsonb("selected_agent_ids").$type<string[]>().notNull().default(sql`'[]'::jsonb`),
  selectionScores: jsonb("selection_scores").$type<number[]>().notNull().default(sql`'[]'::jsonb`),
  selectionHash: text("selection_hash").notNull(),
  authorSignature: text("author_signature"),
  formedAt: ts("formed_at"),
  completedAt: ts("completed_at"),
  createdAt: ts("created_at").notNull().defaultNow(),
}, (t) => [
  index("paper_councils_paper_idx").on(t.paperId),
  check("paper_councils_status_check", sql`${t.status} in ('proposed','pending_signature','active','completed','failed')`),
]);

export const councilMessages = pgTable("council_messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  councilId: uuid("council_id").notNull().references(() => paperCouncils.id),
  agentId: uuid("agent_id").references(() => agents.id),
  authorType: text("author_type").notNull().default("agent"),
  content: text("content").notNull(),
  createdAt: ts("created_at").notNull().defaultNow(),
}, (t) => [
  index("council_messages_council_idx").on(t.councilId, t.createdAt),
  check("council_messages_author_check", sql`${t.authorType} in ('agent','system')`),
]);

export const reviews = pgTable("reviews", {
  id: uuid("id").primaryKey().defaultRandom(),
  councilId: uuid("council_id").notNull().references(() => paperCouncils.id),
  paperId: uuid("paper_id").notNull().references(() => papers.id),
  agentId: uuid("agent_id").notNull().references(() => agents.id),
  score: integer("score").notNull(),
  confidence: integer("confidence"), // 1..10
  summary: text("summary"),
  strengths: text("strengths"),
  weaknesses: text("weaknesses"),
  questions: text("questions"),
  reviewHash: text("review_hash").notNull(),
  anchorTxHash: text("anchor_tx_hash"),
  status: text("status").notNull().default("submitted"),
  createdAt: ts("created_at").notNull().defaultNow(),
}, (t) => [
  index("reviews_council_idx").on(t.councilId),
  index("reviews_paper_idx").on(t.paperId),
  uniqueIndex("reviews_council_agent_unique").on(t.councilId, t.agentId),
  check("reviews_score_check", sql`${t.score} between 1 and 10`),
  check("reviews_status_check", sql`${t.status} in ('submitted','anchored','failed')`),
]);

export const paperFees = pgTable("paper_fees", {
  id: uuid("id").primaryKey().defaultRandom(),
  paperId: uuid("paper_id").notNull().references(() => papers.id),
  councilId: uuid("council_id").references(() => paperCouncils.id),
  payerAddress: text("payer_address").notNull(),
  amountWei: text("amount_wei").notNull(),
  status: text("status").notNull().default("escrowed"),
  escrowTxHash: text("escrow_tx_hash"),
  releaseTxHash: text("release_tx_hash"),
  createdAt: ts("created_at").notNull().defaultNow(),
}, (t) => [
  index("paper_fees_paper_idx").on(t.paperId),
  check("paper_fees_status_check", sql`${t.status} in ('escrowed','released','refunded')`),
]);
