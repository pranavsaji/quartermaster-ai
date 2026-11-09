CREATE TABLE "job_leases" (
	"name" text PRIMARY KEY NOT NULL,
	"holder" text NOT NULL,
	"lease_until" timestamp with time zone NOT NULL
);
