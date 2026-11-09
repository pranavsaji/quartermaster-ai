CREATE TABLE "agent_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"request_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"status" text NOT NULL,
	"ai_mode" text NOT NULL,
	"model" text,
	"tokens_used" integer DEFAULT 0 NOT NULL,
	"tool_calls" integer DEFAULT 0 NOT NULL,
	"error" text,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "approval_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"purchase_order_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"action" text NOT NULL,
	"cart_hash" text NOT NULL,
	"acknowledged_review_codes" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"note" text,
	"ip" text,
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"sequence" bigint NOT NULL,
	"action" text NOT NULL,
	"actor_type" text NOT NULL,
	"actor_id" text,
	"entity_type" text NOT NULL,
	"entity_id" text,
	"data" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"prev_hash" text,
	"hash" text NOT NULL,
	"correlation_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "budget_accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"period_start" date NOT NULL,
	"period_end" date NOT NULL,
	"currency" text NOT NULL,
	"limit_minor" bigint NOT NULL,
	"reserved_minor" bigint DEFAULT 0 NOT NULL,
	"spent_minor" bigint DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "budget_reservations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"budget_account_id" uuid NOT NULL,
	"intent_id" uuid NOT NULL,
	"purchase_order_id" uuid NOT NULL,
	"amount_minor" bigint NOT NULL,
	"status" text DEFAULT 'ACTIVE' NOT NULL,
	"release_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"released_at" timestamp with time zone,
	"consumed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "consumption_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"inventory_item_id" uuid NOT NULL,
	"day" date NOT NULL,
	"quantity" integer NOT NULL,
	"data_source" text DEFAULT 'SYNTHETIC' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "deliveries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"purchase_order_id" uuid NOT NULL,
	"supplier_id" uuid NOT NULL,
	"status" text DEFAULT 'SCHEDULED' NOT NULL,
	"expected_date" date NOT NULL,
	"original_expected_date" date NOT NULL,
	"delivered_at" timestamp with time zone,
	"delay_reason" text,
	"data_source" text DEFAULT 'SYNTHETIC' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "forecast_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"request_id" uuid,
	"demand_multiplier" double precision NOT NULL,
	"method" text DEFAULT 'REORDER_POINT_V1' NOT NULL,
	"lines" jsonb NOT NULL,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "goods_receipts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"delivery_id" uuid NOT NULL,
	"purchase_order_item_id" uuid NOT NULL,
	"units_received" integer NOT NULL,
	"received_by" uuid NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "idempotency_keys" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"key" text NOT NULL,
	"route" text NOT NULL,
	"request_hash" text NOT NULL,
	"status" text NOT NULL,
	"response_status" integer,
	"response_body" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "intent_certificates" (
	"id" uuid PRIMARY KEY NOT NULL,
	"organization_id" uuid NOT NULL,
	"purchase_order_id" uuid NOT NULL,
	"buyer_id" uuid NOT NULL,
	"policy_decision_id" uuid NOT NULL,
	"approval_event_id" uuid NOT NULL,
	"payload" jsonb NOT NULL,
	"signature" text NOT NULL,
	"key_id" text NOT NULL,
	"status" text DEFAULT 'ACTIVE' NOT NULL,
	"revoked_reason" text,
	"issued_at" timestamp with time zone NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"consumed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "inventory_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"sku" text NOT NULL,
	"name" text NOT NULL,
	"category" text NOT NULL,
	"unit" text NOT NULL,
	"on_hand" integer DEFAULT 0 NOT NULL,
	"safety_stock" integer DEFAULT 0 NOT NULL,
	"coverage_days" integer DEFAULT 3 NOT NULL,
	"lead_time_days_override" integer,
	"preferred_supplier_id" uuid,
	"search_query" text NOT NULL,
	"keywords" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"data_source" text DEFAULT 'SYNTHETIC' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invoice_matches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"invoice_id" uuid NOT NULL,
	"check" text NOT NULL,
	"passed" boolean NOT NULL,
	"severity" text,
	"detail" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invoices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"supplier_id" uuid NOT NULL,
	"purchase_order_id" uuid,
	"invoice_number" text NOT NULL,
	"invoice_number_normalized" text NOT NULL,
	"invoice_date" date NOT NULL,
	"currency" text NOT NULL,
	"lines" jsonb NOT NULL,
	"total_minor" bigint NOT NULL,
	"notes" text,
	"content_hash" text NOT NULL,
	"status" text NOT NULL,
	"settlement_allowed" boolean NOT NULL,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "market_quotes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"request_id" uuid,
	"inventory_item_id" uuid NOT NULL,
	"source" text DEFAULT 'CHANNEL3_MARKET' NOT NULL,
	"external_product_id" text NOT NULL,
	"title" text NOT NULL,
	"merchant_domain" text NOT NULL,
	"url" text NOT NULL,
	"price_minor" bigint NOT NULL,
	"currency" text NOT NULL,
	"pack_quantity" double precision,
	"normalized_unit_price_minor" double precision,
	"comparable" boolean NOT NULL,
	"availability" text NOT NULL,
	"suspicious" boolean DEFAULT false NOT NULL,
	"observed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "memberships" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "organizations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"timezone" text DEFAULT 'America/Los_Angeles' NOT NULL,
	"currency" text DEFAULT 'USD' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payment_attempts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"intent_id" uuid NOT NULL,
	"purchase_order_id" uuid NOT NULL,
	"status" text DEFAULT 'CREATED' NOT NULL,
	"amount_minor" bigint NOT NULL,
	"currency" text NOT NULL,
	"paypal_order_id" text,
	"paypal_capture_id" text,
	"captured_amount_minor" bigint,
	"refunded_amount_minor" bigint DEFAULT 0 NOT NULL,
	"payer_id" text,
	"failure_code" text,
	"failure_message" text,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	"last_reconciled_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "paypal_webhook_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" text NOT NULL,
	"event_type" text NOT NULL,
	"resource_id" text,
	"organization_id" uuid,
	"verified" boolean NOT NULL,
	"processed" boolean DEFAULT false NOT NULL,
	"result" text,
	"payload" jsonb NOT NULL,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL,
	"processed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "policy_decisions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"purchase_order_id" uuid NOT NULL,
	"request_id" uuid,
	"stage" text NOT NULL,
	"decision" text NOT NULL,
	"violations" jsonb NOT NULL,
	"checks" jsonb NOT NULL,
	"human_approval_required" boolean NOT NULL,
	"mandate_id" uuid,
	"mandate_version" integer NOT NULL,
	"policy_version" text NOT NULL,
	"input_digest" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "purchase_candidates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"request_id" uuid NOT NULL,
	"inventory_item_id" uuid NOT NULL,
	"supplier_id" uuid NOT NULL,
	"catalog_item_id" uuid NOT NULL,
	"packs" integer NOT NULL,
	"units" integer NOT NULL,
	"quote" jsonb NOT NULL,
	"delivered_unit_cost_minor" double precision NOT NULL,
	"rank" integer,
	"eligible" boolean NOT NULL,
	"ineligible_reasons" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"quarantined" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "purchase_order_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"purchase_order_id" uuid NOT NULL,
	"position" integer NOT NULL,
	"kind" text NOT NULL,
	"sku" text,
	"description" text NOT NULL,
	"category" text,
	"quantity" integer NOT NULL,
	"unit_price_minor" bigint NOT NULL,
	"line_total_minor" bigint NOT NULL,
	"recurring" boolean DEFAULT false NOT NULL,
	"inventory_item_id" uuid,
	"catalog_item_id" uuid,
	"pack_quantity" integer
);
--> statement-breakpoint
CREATE TABLE "purchase_orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"request_id" uuid,
	"supplier_id" uuid NOT NULL,
	"number" text NOT NULL,
	"status" text DEFAULT 'PROPOSED' NOT NULL,
	"currency" text NOT NULL,
	"subtotal_minor" bigint NOT NULL,
	"shipping_minor" bigint NOT NULL,
	"tax_minor" bigint NOT NULL,
	"fees_minor" bigint NOT NULL,
	"total_minor" bigint NOT NULL,
	"cart_hash" text NOT NULL,
	"cart_snapshot" jsonb NOT NULL,
	"plan_attempt" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "purchase_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"created_by" uuid NOT NULL,
	"status" text DEFAULT 'DRAFT' NOT NULL,
	"instruction" text NOT NULL,
	"currency" text NOT NULL,
	"budget_limit_minor" bigint,
	"required_by" date,
	"allow_alternatives" boolean DEFAULT true NOT NULL,
	"demand_multiplier" double precision,
	"intent" jsonb,
	"ai_mode" text,
	"recommendation" jsonb,
	"market" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"forecast_run_id" uuid,
	"active_proposal_id" uuid,
	"error" text,
	"research_started_at" timestamp with time zone,
	"research_completed_at" timestamp with time zone,
	"approved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "refunds" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"payment_attempt_id" uuid NOT NULL,
	"paypal_refund_id" text,
	"amount_minor" bigint NOT NULL,
	"status" text NOT NULL,
	"reason" text NOT NULL,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "security_findings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"type" text NOT NULL,
	"severity" text NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"source_kind" text NOT NULL,
	"source_id" text,
	"evidence" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"related_purchase_order_id" uuid,
	"related_request_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"token_hash" text NOT NULL,
	"user_id" uuid NOT NULL,
	"organization_id" uuid NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"revoked_at" timestamp with time zone,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"user_agent" text,
	"ip" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "signing_keys" (
	"key_id" text PRIMARY KEY NOT NULL,
	"algorithm" text DEFAULT 'Ed25519' NOT NULL,
	"public_key_pem" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"retired_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "spend_mandates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"version" integer NOT NULL,
	"status" text NOT NULL,
	"currency" text NOT NULL,
	"weekly_budget_minor" bigint NOT NULL,
	"per_order_limit_minor" bigint NOT NULL,
	"auto_approval_limit_minor" bigint NOT NULL,
	"human_approval_required" boolean DEFAULT true NOT NULL,
	"approved_supplier_ids" jsonb NOT NULL,
	"allowed_categories" jsonb NOT NULL,
	"max_market_price_premium_pct" integer NOT NULL,
	"market_price_action" text DEFAULT 'REVIEW' NOT NULL,
	"duplicate_window_hours" integer DEFAULT 24 NOT NULL,
	"duplicate_action" text DEFAULT 'REVIEW' NOT NULL,
	"subscriptions_allowed" boolean DEFAULT false NOT NULL,
	"certificate_ttl_minutes" integer DEFAULT 30 NOT NULL,
	"max_quantity_multiple_of_need" double precision DEFAULT 2 NOT NULL,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "stock_movements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"inventory_item_id" uuid NOT NULL,
	"quantity_delta" integer NOT NULL,
	"reason" text NOT NULL,
	"reference_type" text,
	"reference_id" uuid,
	"note" text,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "supplier_catalog_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"supplier_id" uuid NOT NULL,
	"sku" text NOT NULL,
	"title" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"category" text NOT NULL,
	"inventory_item_id" uuid,
	"pack_quantity" integer NOT NULL,
	"unit_price_minor" bigint NOT NULL,
	"currency" text DEFAULT 'USD' NOT NULL,
	"in_stock" boolean DEFAULT true NOT NULL,
	"recurring" boolean DEFAULT false NOT NULL,
	"quarantined" boolean DEFAULT false NOT NULL,
	"quarantine_reason" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "suppliers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"name" text NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"checkout_eligible" boolean DEFAULT false NOT NULL,
	"lead_time_days" integer NOT NULL,
	"tax_rate_bps" integer DEFAULT 0 NOT NULL,
	"fee_terms" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"storefront_quote_lines" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"website" text,
	"description" text,
	"data_source" text DEFAULT 'SANDBOX_SUPPLIER' NOT NULL,
	"quarantined" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tool_executions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"agent_run_id" uuid NOT NULL,
	"tool" text NOT NULL,
	"status" text NOT NULL,
	"input" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"summary" text NOT NULL,
	"error" text,
	"duration_ms" integer NOT NULL,
	"started_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"name" text NOT NULL,
	"password_hash" text NOT NULL,
	"disabled" boolean DEFAULT false NOT NULL,
	"failed_logins" integer DEFAULT 0 NOT NULL,
	"locked_until" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "agent_runs" ADD CONSTRAINT "agent_runs_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_runs" ADD CONSTRAINT "agent_runs_request_id_purchase_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."purchase_requests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "approval_events" ADD CONSTRAINT "approval_events_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "approval_events" ADD CONSTRAINT "approval_events_purchase_order_id_purchase_orders_id_fk" FOREIGN KEY ("purchase_order_id") REFERENCES "public"."purchase_orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "approval_events" ADD CONSTRAINT "approval_events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "budget_accounts" ADD CONSTRAINT "budget_accounts_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "budget_reservations" ADD CONSTRAINT "budget_reservations_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "budget_reservations" ADD CONSTRAINT "budget_reservations_budget_account_id_budget_accounts_id_fk" FOREIGN KEY ("budget_account_id") REFERENCES "public"."budget_accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consumption_history" ADD CONSTRAINT "consumption_history_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consumption_history" ADD CONSTRAINT "consumption_history_inventory_item_id_inventory_items_id_fk" FOREIGN KEY ("inventory_item_id") REFERENCES "public"."inventory_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deliveries" ADD CONSTRAINT "deliveries_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deliveries" ADD CONSTRAINT "deliveries_purchase_order_id_purchase_orders_id_fk" FOREIGN KEY ("purchase_order_id") REFERENCES "public"."purchase_orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deliveries" ADD CONSTRAINT "deliveries_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "forecast_runs" ADD CONSTRAINT "forecast_runs_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "goods_receipts" ADD CONSTRAINT "goods_receipts_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "goods_receipts" ADD CONSTRAINT "goods_receipts_delivery_id_deliveries_id_fk" FOREIGN KEY ("delivery_id") REFERENCES "public"."deliveries"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "goods_receipts" ADD CONSTRAINT "goods_receipts_purchase_order_item_id_purchase_order_items_id_fk" FOREIGN KEY ("purchase_order_item_id") REFERENCES "public"."purchase_order_items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "idempotency_keys" ADD CONSTRAINT "idempotency_keys_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "intent_certificates" ADD CONSTRAINT "intent_certificates_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "intent_certificates" ADD CONSTRAINT "intent_certificates_purchase_order_id_purchase_orders_id_fk" FOREIGN KEY ("purchase_order_id") REFERENCES "public"."purchase_orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "intent_certificates" ADD CONSTRAINT "intent_certificates_buyer_id_users_id_fk" FOREIGN KEY ("buyer_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "intent_certificates" ADD CONSTRAINT "intent_certificates_policy_decision_id_policy_decisions_id_fk" FOREIGN KEY ("policy_decision_id") REFERENCES "public"."policy_decisions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "intent_certificates" ADD CONSTRAINT "intent_certificates_approval_event_id_approval_events_id_fk" FOREIGN KEY ("approval_event_id") REFERENCES "public"."approval_events"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "intent_certificates" ADD CONSTRAINT "intent_certificates_key_id_signing_keys_key_id_fk" FOREIGN KEY ("key_id") REFERENCES "public"."signing_keys"("key_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_items" ADD CONSTRAINT "inventory_items_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoice_matches" ADD CONSTRAINT "invoice_matches_invoice_id_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_purchase_order_id_purchase_orders_id_fk" FOREIGN KEY ("purchase_order_id") REFERENCES "public"."purchase_orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "market_quotes" ADD CONSTRAINT "market_quotes_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "market_quotes" ADD CONSTRAINT "market_quotes_inventory_item_id_inventory_items_id_fk" FOREIGN KEY ("inventory_item_id") REFERENCES "public"."inventory_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_attempts" ADD CONSTRAINT "payment_attempts_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_attempts" ADD CONSTRAINT "payment_attempts_intent_id_intent_certificates_id_fk" FOREIGN KEY ("intent_id") REFERENCES "public"."intent_certificates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_attempts" ADD CONSTRAINT "payment_attempts_purchase_order_id_purchase_orders_id_fk" FOREIGN KEY ("purchase_order_id") REFERENCES "public"."purchase_orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "policy_decisions" ADD CONSTRAINT "policy_decisions_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "policy_decisions" ADD CONSTRAINT "policy_decisions_purchase_order_id_purchase_orders_id_fk" FOREIGN KEY ("purchase_order_id") REFERENCES "public"."purchase_orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_candidates" ADD CONSTRAINT "purchase_candidates_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_candidates" ADD CONSTRAINT "purchase_candidates_request_id_purchase_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."purchase_requests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_candidates" ADD CONSTRAINT "purchase_candidates_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_candidates" ADD CONSTRAINT "purchase_candidates_catalog_item_id_supplier_catalog_items_id_fk" FOREIGN KEY ("catalog_item_id") REFERENCES "public"."supplier_catalog_items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_order_items" ADD CONSTRAINT "purchase_order_items_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_order_items" ADD CONSTRAINT "purchase_order_items_purchase_order_id_purchase_orders_id_fk" FOREIGN KEY ("purchase_order_id") REFERENCES "public"."purchase_orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_request_id_purchase_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."purchase_requests"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_requests" ADD CONSTRAINT "purchase_requests_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_requests" ADD CONSTRAINT "purchase_requests_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_payment_attempt_id_payment_attempts_id_fk" FOREIGN KEY ("payment_attempt_id") REFERENCES "public"."payment_attempts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "security_findings" ADD CONSTRAINT "security_findings_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "spend_mandates" ADD CONSTRAINT "spend_mandates_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_inventory_item_id_inventory_items_id_fk" FOREIGN KEY ("inventory_item_id") REFERENCES "public"."inventory_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supplier_catalog_items" ADD CONSTRAINT "supplier_catalog_items_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supplier_catalog_items" ADD CONSTRAINT "supplier_catalog_items_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supplier_catalog_items" ADD CONSTRAINT "supplier_catalog_items_inventory_item_id_inventory_items_id_fk" FOREIGN KEY ("inventory_item_id") REFERENCES "public"."inventory_items"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "suppliers" ADD CONSTRAINT "suppliers_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tool_executions" ADD CONSTRAINT "tool_executions_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tool_executions" ADD CONSTRAINT "tool_executions_agent_run_id_agent_runs_id_fk" FOREIGN KEY ("agent_run_id") REFERENCES "public"."agent_runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "agent_runs_request_idx" ON "agent_runs" USING btree ("request_id");--> statement-breakpoint
CREATE UNIQUE INDEX "audit_org_sequence_uq" ON "audit_events" USING btree ("organization_id","sequence");--> statement-breakpoint
CREATE INDEX "audit_entity_idx" ON "audit_events" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE UNIQUE INDEX "budget_accounts_org_period_uq" ON "budget_accounts" USING btree ("organization_id","period_start");--> statement-breakpoint
CREATE UNIQUE INDEX "reservations_intent_uq" ON "budget_reservations" USING btree ("intent_id");--> statement-breakpoint
CREATE INDEX "reservations_status_idx" ON "budget_reservations" USING btree ("organization_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "consumption_item_day_uq" ON "consumption_history" USING btree ("inventory_item_id","day");--> statement-breakpoint
CREATE UNIQUE INDEX "deliveries_po_uq" ON "deliveries" USING btree ("purchase_order_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idempotency_scope_uq" ON "idempotency_keys" USING btree ("organization_id","user_id","key");--> statement-breakpoint
CREATE UNIQUE INDEX "certificates_po_active_uq" ON "intent_certificates" USING btree ("purchase_order_id") WHERE "intent_certificates"."status" in ('ACTIVE','CONSUMED');--> statement-breakpoint
CREATE INDEX "certificates_org_status_idx" ON "intent_certificates" USING btree ("organization_id","status","expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "inventory_items_org_sku_uq" ON "inventory_items" USING btree ("organization_id","sku");--> statement-breakpoint
CREATE INDEX "invoices_supplier_number_idx" ON "invoices" USING btree ("organization_id","supplier_id","invoice_number_normalized");--> statement-breakpoint
CREATE INDEX "invoices_content_idx" ON "invoices" USING btree ("organization_id","content_hash");--> statement-breakpoint
CREATE UNIQUE INDEX "invoices_po_settled_uq" ON "invoices" USING btree ("purchase_order_id") WHERE "invoices"."settlement_allowed" = true;--> statement-breakpoint
CREATE INDEX "market_quotes_item_idx" ON "market_quotes" USING btree ("inventory_item_id","observed_at");--> statement-breakpoint
CREATE INDEX "market_quotes_request_idx" ON "market_quotes" USING btree ("request_id");--> statement-breakpoint
CREATE UNIQUE INDEX "memberships_org_user_uq" ON "memberships" USING btree ("organization_id","user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "payments_intent_uq" ON "payment_attempts" USING btree ("intent_id");--> statement-breakpoint
CREATE UNIQUE INDEX "payments_paypal_order_uq" ON "payment_attempts" USING btree ("paypal_order_id");--> statement-breakpoint
CREATE UNIQUE INDEX "payments_paypal_capture_uq" ON "payment_attempts" USING btree ("paypal_capture_id");--> statement-breakpoint
CREATE INDEX "payments_org_status_idx" ON "payment_attempts" USING btree ("organization_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "webhook_event_id_uq" ON "paypal_webhook_events" USING btree ("event_id");--> statement-breakpoint
CREATE INDEX "policy_decisions_po_idx" ON "policy_decisions" USING btree ("purchase_order_id","created_at");--> statement-breakpoint
CREATE INDEX "policy_decisions_org_idx" ON "policy_decisions" USING btree ("organization_id","created_at");--> statement-breakpoint
CREATE INDEX "purchase_candidates_request_idx" ON "purchase_candidates" USING btree ("request_id");--> statement-breakpoint
CREATE UNIQUE INDEX "po_items_po_position_uq" ON "purchase_order_items" USING btree ("purchase_order_id","position");--> statement-breakpoint
CREATE UNIQUE INDEX "purchase_orders_org_number_uq" ON "purchase_orders" USING btree ("organization_id","number");--> statement-breakpoint
CREATE INDEX "purchase_orders_request_idx" ON "purchase_orders" USING btree ("request_id");--> statement-breakpoint
CREATE INDEX "purchase_orders_org_status_idx" ON "purchase_orders" USING btree ("organization_id","status","created_at");--> statement-breakpoint
CREATE INDEX "purchase_requests_org_idx" ON "purchase_requests" USING btree ("organization_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "refunds_paypal_id_uq" ON "refunds" USING btree ("paypal_refund_id");--> statement-breakpoint
CREATE INDEX "security_findings_org_idx" ON "security_findings" USING btree ("organization_id","created_at");--> statement-breakpoint
CREATE INDEX "security_findings_request_idx" ON "security_findings" USING btree ("related_request_id");--> statement-breakpoint
CREATE UNIQUE INDEX "sessions_token_hash_uq" ON "sessions" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "sessions_user_idx" ON "sessions" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "mandates_org_version_uq" ON "spend_mandates" USING btree ("organization_id","version");--> statement-breakpoint
CREATE UNIQUE INDEX "mandates_org_active_uq" ON "spend_mandates" USING btree ("organization_id") WHERE "spend_mandates"."status" = 'ACTIVE';--> statement-breakpoint
CREATE INDEX "stock_movements_item_idx" ON "stock_movements" USING btree ("inventory_item_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "catalog_supplier_sku_uq" ON "supplier_catalog_items" USING btree ("supplier_id","sku");--> statement-breakpoint
CREATE INDEX "catalog_item_idx" ON "supplier_catalog_items" USING btree ("inventory_item_id");--> statement-breakpoint
CREATE UNIQUE INDEX "suppliers_org_name_uq" ON "suppliers" USING btree ("organization_id","name");--> statement-breakpoint
CREATE INDEX "tool_executions_run_idx" ON "tool_executions" USING btree ("agent_run_id","started_at");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_uq" ON "users" USING btree (lower("email"));