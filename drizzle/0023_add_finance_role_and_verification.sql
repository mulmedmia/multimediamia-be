-- Migration 0023: Add FINANCE role and payment verification fields to Registration
DO $$ BEGIN
  ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'FINANCE';
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
ALTER TABLE "Registration" ADD COLUMN IF NOT EXISTS "is_verified_finance" boolean DEFAULT false NOT NULL;
--> statement-breakpoint
ALTER TABLE "Registration" ADD COLUMN IF NOT EXISTS "verified_finance_at" timestamp;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "Registration" ADD COLUMN IF NOT EXISTS "verified_finance_by" text REFERENCES "User"("users_id");
EXCEPTION
  WHEN duplicate_column THEN null;
END $$;
--> statement-breakpoint
ALTER TABLE "Registration" ADD COLUMN IF NOT EXISTS "finance_notes" text;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_registration_is_verified_finance" ON "Registration" ("is_verified_finance");
