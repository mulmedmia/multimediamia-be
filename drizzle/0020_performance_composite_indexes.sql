CREATE INDEX IF NOT EXISTS "idx_submission_link_submission_id" ON "SubmissionLink" ("submission_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_registration_leaderboard" ON "Registration" ("category_id", "is_verified", "xp" DESC, "diamond" DESC);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_submission_show_it" ON "Submission" ("status", "is_verified", "created_at" DESC);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_otp_email_created_at" ON "OTP" ("email", "created_at" DESC);
