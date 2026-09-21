CREATE TABLE "council_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"council_id" uuid NOT NULL,
	"agent_id" uuid,
	"author_type" text DEFAULT 'agent' NOT NULL,
	"content" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "council_messages_author_check" CHECK ("council_messages"."author_type" in ('agent','system'))
);
--> statement-breakpoint
CREATE TABLE "paper_councils" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"paper_id" uuid NOT NULL,
	"tenant_id" uuid NOT NULL,
	"status" text DEFAULT 'proposed' NOT NULL,
	"selected_agent_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"selection_scores" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"selection_hash" text NOT NULL,
	"author_signature" text,
	"formed_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "paper_councils_status_check" CHECK ("paper_councils"."status" in ('proposed','pending_signature','active','completed','failed'))
);
--> statement-breakpoint
CREATE TABLE "paper_fees" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"paper_id" uuid NOT NULL,
	"council_id" uuid,
	"payer_address" text NOT NULL,
	"amount_wei" text NOT NULL,
	"status" text DEFAULT 'escrowed' NOT NULL,
	"escrow_tx_hash" text,
	"release_tx_hash" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "paper_fees_status_check" CHECK ("paper_fees"."status" in ('escrowed','released','refunded'))
);
--> statement-breakpoint
CREATE TABLE "papers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"author_address" text NOT NULL,
	"title" text NOT NULL,
	"abstract" text NOT NULL,
	"domain" text NOT NULL,
	"keywords" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"paper_hash" text NOT NULL,
	"pdf_url" text,
	"status" text DEFAULT 'submitted' NOT NULL,
	"fee_tx_hash" text,
	"fee_amount_wei" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "papers_status_check" CHECK ("papers"."status" in ('submitted','council_proposed','pending_signature','reviewing','completed','failed'))
);
--> statement-breakpoint
CREATE TABLE "reviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"council_id" uuid NOT NULL,
	"paper_id" uuid NOT NULL,
	"agent_id" uuid NOT NULL,
	"score" integer NOT NULL,
	"confidence" integer,
	"summary" text,
	"strengths" text,
	"weaknesses" text,
	"questions" text,
	"review_hash" text NOT NULL,
	"anchor_tx_hash" text,
	"status" text DEFAULT 'submitted' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "reviews_score_check" CHECK ("reviews"."score" between 1 and 10),
	CONSTRAINT "reviews_status_check" CHECK ("reviews"."status" in ('submitted','anchored','failed'))
);
--> statement-breakpoint
ALTER TABLE "council_messages" ADD CONSTRAINT "council_messages_council_id_paper_councils_id_fk" FOREIGN KEY ("council_id") REFERENCES "public"."paper_councils"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "council_messages" ADD CONSTRAINT "council_messages_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "paper_councils" ADD CONSTRAINT "paper_councils_paper_id_papers_id_fk" FOREIGN KEY ("paper_id") REFERENCES "public"."papers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "paper_councils" ADD CONSTRAINT "paper_councils_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "paper_fees" ADD CONSTRAINT "paper_fees_paper_id_papers_id_fk" FOREIGN KEY ("paper_id") REFERENCES "public"."papers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "paper_fees" ADD CONSTRAINT "paper_fees_council_id_paper_councils_id_fk" FOREIGN KEY ("council_id") REFERENCES "public"."paper_councils"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "papers" ADD CONSTRAINT "papers_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_council_id_paper_councils_id_fk" FOREIGN KEY ("council_id") REFERENCES "public"."paper_councils"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_paper_id_papers_id_fk" FOREIGN KEY ("paper_id") REFERENCES "public"."papers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "council_messages_council_idx" ON "council_messages" USING btree ("council_id","created_at");--> statement-breakpoint
CREATE INDEX "paper_councils_paper_idx" ON "paper_councils" USING btree ("paper_id");--> statement-breakpoint
CREATE INDEX "paper_fees_paper_idx" ON "paper_fees" USING btree ("paper_id");--> statement-breakpoint
CREATE INDEX "papers_tenant_idx" ON "papers" USING btree ("tenant_id","created_at");--> statement-breakpoint
CREATE INDEX "papers_domain_idx" ON "papers" USING btree ("domain");--> statement-breakpoint
CREATE INDEX "reviews_council_idx" ON "reviews" USING btree ("council_id");--> statement-breakpoint
CREATE INDEX "reviews_paper_idx" ON "reviews" USING btree ("paper_id");--> statement-breakpoint
CREATE UNIQUE INDEX "reviews_council_agent_unique" ON "reviews" USING btree ("council_id","agent_id");