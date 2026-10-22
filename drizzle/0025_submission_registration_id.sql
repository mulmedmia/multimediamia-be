-- Migration 0025: Refactor Submission to reference Registration (registration_id) and remove redundant category_id and team_name

-- 1. Add registration_id column
ALTER TABLE "Submission" ADD COLUMN IF NOT EXISTS "registration_id" text REFERENCES "Registration"("registration_id") ON DELETE CASCADE;
--> statement-breakpoint

-- 2. Backfill registration_id from Registration by matching user_id and category_id (if user_id still exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Submission' AND column_name = 'user_id') THEN
    UPDATE "Submission" s
    SET "registration_id" = r."registration_id"
    FROM "Registration" r
    WHERE s."registration_id" IS NULL
      AND s."user_id" = r."user_id"
      AND s."category_id" = r."category_id";

    UPDATE "Submission" s
    SET "registration_id" = (
      SELECT r."registration_id"
      FROM "Registration" r
      WHERE r."user_id" = s."user_id"
      LIMIT 1
    )
    WHERE s."registration_id" IS NULL;
  END IF;
END $$;
--> statement-breakpoint

-- 4. Delete orphan submissions that cannot be mapped to any registration
DELETE FROM "Submission" WHERE "registration_id" IS NULL;
--> statement-breakpoint

-- 5. Set registration_id to NOT NULL
ALTER TABLE "Submission" ALTER COLUMN "registration_id" SET NOT NULL;
--> statement-breakpoint

-- 6. Add unique constraint and index on registration_id
ALTER TABLE "Submission" DROP CONSTRAINT IF EXISTS "Submission_registration_id_unique";
--> statement-breakpoint
ALTER TABLE "Submission" ADD CONSTRAINT "Submission_registration_id_unique" UNIQUE ("registration_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_submission_registration_id" ON "Submission" ("registration_id");
--> statement-breakpoint

-- 7. Drop obsolete foreign keys, indexes, and columns
DROP INDEX IF EXISTS "idx_submission_category_id";
--> statement-breakpoint
DROP INDEX IF EXISTS "idx_submission_user_id";
--> statement-breakpoint
ALTER TABLE "Submission" DROP CONSTRAINT IF EXISTS "Submission_category_id_Category_category_id_fk";
--> statement-breakpoint
ALTER TABLE "Submission" DROP CONSTRAINT IF EXISTS "Submission_user_id_User_users_id_fk";
--> statement-breakpoint
ALTER TABLE "Submission" DROP COLUMN IF EXISTS "category_id";
--> statement-breakpoint
ALTER TABLE "Submission" DROP COLUMN IF EXISTS "user_id";
--> statement-breakpoint
ALTER TABLE "Submission" DROP COLUMN IF EXISTS "team_name";
