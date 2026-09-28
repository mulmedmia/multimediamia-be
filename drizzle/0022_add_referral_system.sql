-- Migration 0022: Add referral system (referral_code on Registration and ReferralLog table)
DO $$ BEGIN
  CREATE TYPE "ReferralStatus" AS ENUM('PENDING', 'APPROVED', 'REJECTED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

ALTER TABLE "Registration" ADD COLUMN IF NOT EXISTS "referral_code" text;
CREATE UNIQUE INDEX IF NOT EXISTS "idx_registration_referral_code_unique" ON "Registration" ("referral_code");

CREATE TABLE IF NOT EXISTS "ReferralLog" (
  "referral_log_id" text PRIMARY KEY NOT NULL,
  "referral_code" text NOT NULL,
  "referrer_registration_id" text NOT NULL REFERENCES "Registration"("registration_id") ON DELETE CASCADE,
  "referee_registration_id" text NOT NULL REFERENCES "Registration"("registration_id") ON DELETE CASCADE,
  "referrer_xp" integer DEFAULT 250 NOT NULL,
  "referee_xp" integer DEFAULT 100 NOT NULL,
  "status" "ReferralStatus" DEFAULT 'PENDING' NOT NULL,
  "verified_at" timestamp,
  "verified_by" text REFERENCES "User"("users_id"),
  "admin_notes" text,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "idx_referral_log_status" ON "ReferralLog" ("status");
CREATE INDEX IF NOT EXISTS "idx_referral_log_code" ON "ReferralLog" ("referral_code");
CREATE INDEX IF NOT EXISTS "idx_referral_log_referrer" ON "ReferralLog" ("referrer_registration_id");
CREATE INDEX IF NOT EXISTS "idx_referral_log_referee" ON "ReferralLog" ("referee_registration_id");
CREATE UNIQUE INDEX IF NOT EXISTS "idx_referral_log_referee_unique" ON "ReferralLog" ("referee_registration_id");
