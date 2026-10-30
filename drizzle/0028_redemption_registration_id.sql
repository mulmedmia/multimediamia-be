-- Migration 0028: Refactor Redemption to reference Registration (registration_id) instead of user_id

-- 1. Add registration_id column
ALTER TABLE "Redemption" ADD COLUMN IF NOT EXISTS "registration_id" text REFERENCES "Registration"("registration_id") ON DELETE CASCADE;
--> statement-breakpoint

-- 2. Backfill registration_id from Registration by matching user_id (and category_id if product is category-specific)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Redemption' AND column_name = 'user_id') THEN
    -- Match with registration of product's category if category-specific
    UPDATE "Redemption" rdm
    SET "registration_id" = reg."registration_id"
    FROM "Registration" reg, "product" p
    WHERE rdm."registration_id" IS NULL
      AND rdm."product_id" = p."product_id"
      AND p."category_id" IS NOT NULL
      AND reg."user_id" = rdm."user_id"
      AND reg."category_id" = p."category_id";

    -- Fallback to any registration belonging to that user
    UPDATE "Redemption" rdm
    SET "registration_id" = (
      SELECT reg."registration_id"
      FROM "Registration" reg
      WHERE reg."user_id" = rdm."user_id"
      LIMIT 1
    )
    WHERE rdm."registration_id" IS NULL;
  END IF;
END $$;
--> statement-breakpoint

-- 3. Delete orphan redemptions that cannot be mapped to any registration
DELETE FROM "Redemption" WHERE "registration_id" IS NULL;
--> statement-breakpoint

-- 4. Set registration_id to NOT NULL
ALTER TABLE "Redemption" ALTER COLUMN "registration_id" SET NOT NULL;
--> statement-breakpoint

-- 5. Add index on registration_id
CREATE INDEX IF NOT EXISTS "idx_redemption_registration_id" ON "Redemption" ("registration_id");
--> statement-breakpoint

-- 6. Drop obsolete user_id index, constraint, and column
DROP INDEX IF EXISTS "idx_redemption_user_id";
--> statement-breakpoint
ALTER TABLE "Redemption" DROP CONSTRAINT IF EXISTS "Redemption_user_id_User_users_id_fk";
--> statement-breakpoint
ALTER TABLE "Redemption" DROP COLUMN IF EXISTS "user_id";
