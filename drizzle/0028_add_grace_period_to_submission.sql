-- Migration 0028: Add is_grace_period and grace_delay_seconds to Submission table
ALTER TABLE "Submission" ADD COLUMN IF NOT EXISTS "is_grace_period" boolean DEFAULT false NOT NULL;
ALTER TABLE "Submission" ADD COLUMN IF NOT EXISTS "grace_delay_seconds" integer DEFAULT 0;
