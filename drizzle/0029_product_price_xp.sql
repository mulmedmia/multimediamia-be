ALTER TABLE "product" ADD COLUMN IF NOT EXISTS "price_xp" integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE "Redemption" ADD COLUMN IF NOT EXISTS "xp_used" integer DEFAULT 0 NOT NULL;
