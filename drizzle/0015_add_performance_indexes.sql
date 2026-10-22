CREATE INDEX IF NOT EXISTS "idx_registration_category_id" ON "Registration" ("category_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_registration_user_id" ON "Registration" ("user_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_registration_team_name" ON "Registration" ("team_name");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_registration_is_verified" ON "Registration" ("is_verified");
--> statement-breakpoint
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Submission' AND column_name = 'category_id') THEN
    CREATE INDEX IF NOT EXISTS "idx_submission_category_id" ON "Submission" ("category_id");
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Submission' AND column_name = 'user_id') THEN
    CREATE INDEX IF NOT EXISTS "idx_submission_user_id" ON "Submission" ("user_id");
  END IF;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_submission_status" ON "Submission" ("status");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_submission_is_verified" ON "Submission" ("is_verified");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_mission_submission_mission_id" ON "MissionSubmission" ("mission_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_mission_submission_user_id" ON "MissionSubmission" ("user_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_mission_submission_status" ON "MissionSubmission" ("status");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_mission_category_id" ON "Mission" ("category_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_mission_status" ON "Mission" ("status");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_product_category_id" ON "product" ("category_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_product_is_active" ON "product" ("is_active");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_redemption_user_id" ON "Redemption" ("user_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_redemption_product_id" ON "Redemption" ("product_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_juri_category_id" ON "Juri" ("category_id");
