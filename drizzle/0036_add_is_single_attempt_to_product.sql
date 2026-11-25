-- Migration 0036: Add is_single_attempt flag on product to restrict redemption to 1 transaction attempt per team
ALTER TABLE "product" ADD COLUMN IF NOT EXISTS "is_single_attempt" boolean DEFAULT false NOT NULL;
