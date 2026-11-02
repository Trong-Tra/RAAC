import { sql } from "drizzle-orm";
import {
  pgTable, uuid, text, integer, jsonb, timestamp, bigserial,
  check, index, uniqueIndex,
} from "drizzle-orm/pg-core";

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

export const auditEvents = pgTable("audit_events", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  tenantId: uuid("tenant_id").references(() => tenants.id),
  agentId: uuid("agent_id").references(() => agents.id),
  eventType: text("event_type").notNull(),
  payload: jsonb("payload").$type<Record<string, unknown>>().notNull(),
  createdAt: ts("created_at").notNull().defaultNow(),
}, (t) => [index("audit_events_tenant_idx").on(t.tenantId, t.createdAt)]);

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

// ── RAAC: papers → councils → reviews ──

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
