CREATE TABLE "known_login_addresses" (
	"user_id" uuid NOT NULL,
	"address_hash" text NOT NULL,
	"last_success_at" timestamp with time zone NOT NULL,
	CONSTRAINT "known_login_addresses_user_id_address_hash_pk" PRIMARY KEY("user_id","address_hash")
);
--> statement-breakpoint
CREATE TABLE "usage_counters" (
	"scope" text NOT NULL,
	"day" date NOT NULL,
	"research_runs" integer DEFAULT 0 NOT NULL,
	"model_tokens" bigint DEFAULT 0 NOT NULL,
	CONSTRAINT "usage_counters_scope_day_pk" PRIMARY KEY("scope","day")
);
--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "is_sample" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "known_login_addresses" ADD CONSTRAINT "known_login_addresses_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "organizations_one_sample_uq" ON "organizations" USING btree ("is_sample") WHERE "organizations"."is_sample";--> statement-breakpoint
-- Flag the existing shared sample workspace: the one the published demo owner signs in to (their
-- earliest membership) that still carries the sample name. Sign-ups that chose the same name are
-- not affected.
UPDATE "organizations" SET "is_sample" = true
WHERE "id" = (
	SELECT m."organization_id" FROM "memberships" m
	JOIN "users" u ON u."id" = m."user_id"
	JOIN "organizations" o ON o."id" = m."organization_id"
	WHERE lower(u."email") = 'owner@demo.quartermaster.dev' AND o."name" = 'Saffron & Sage Kitchen'
	ORDER BY m."created_at" ASC
	LIMIT 1
);