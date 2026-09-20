ALTER TABLE "product" ADD COLUMN IF NOT EXISTS "is_unlimited_stock" boolean DEFAULT false NOT NULL;
ALTER TABLE "product" ADD COLUMN IF NOT EXISTS "is_single_redeem" boolean DEFAULT false NOT NULL;
ALTER TABLE "Redemption" ADD COLUMN IF NOT EXISTS "quantity" integer DEFAULT 1 NOT NULL;
