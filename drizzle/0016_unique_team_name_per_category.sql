-- Migration 0016: Unique Team Name per Category
CREATE UNIQUE INDEX IF NOT EXISTS "idx_registration_category_team_name_unique"
ON "Registration" ("category_id", LOWER(TRIM("team_name")))
WHERE "team_name" IS NOT NULL AND TRIM("team_name") <> '';
