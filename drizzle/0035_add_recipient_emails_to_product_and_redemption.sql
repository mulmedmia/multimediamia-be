-- Migration 0035: Add require_recipient_emails flag on product and recipient_emails storage on Redemption
ALTER TABLE "product" ADD COLUMN IF NOT EXISTS "require_recipient_emails" boolean DEFAULT false NOT NULL;
ALTER TABLE "Redemption" ADD COLUMN IF NOT EXISTS "recipient_emails" text;
