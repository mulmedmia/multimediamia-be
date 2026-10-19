-- Migration 0024: Bind MissionSubmission to specific team registration_id
ALTER TABLE "MissionSubmission" ADD COLUMN IF NOT EXISTS "registration_id" text REFERENCES "Registration"("registration_id") ON DELETE CASCADE;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_mission_submission_registration_id" ON "MissionSubmission" ("registration_id");
--> statement-breakpoint
-- Backfill registration_id for category-specific missions
UPDATE "MissionSubmission" ms
SET "registration_id" = r."registration_id"
FROM "Mission" m, "Registration" r
WHERE ms."mission_id" = m."mission_id"
  AND ms."registration_id" IS NULL
  AND m."category_id" IS NOT NULL
  AND r."user_id" = ms."user_id"
  AND r."category_id" = m."category_id";
--> statement-breakpoint
-- Backfill registration_id for global missions where user only has 1 registration
UPDATE "MissionSubmission" ms
SET "registration_id" = (
  SELECT r."registration_id"
  FROM "Registration" r
  WHERE r."user_id" = ms."user_id"
  LIMIT 1
)
WHERE ms."registration_id" IS NULL
  AND (
    SELECT COUNT(*)
    FROM "Registration" r2
    WHERE r2."user_id" = ms."user_id"
  ) = 1;
