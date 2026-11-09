ALTER TABLE "refunds" ADD COLUMN "request_key" text;--> statement-breakpoint
CREATE UNIQUE INDEX "refunds_request_key_uq" ON "refunds" USING btree ("request_key");