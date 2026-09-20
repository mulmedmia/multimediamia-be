-- User
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "created_by" text;
--> statement-breakpoint
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "updated_by" text;
--> statement-breakpoint
UPDATE "User" SET "created_by" = "users_id", "updated_by" = "users_id" WHERE "created_by" IS NULL;
--> statement-breakpoint

-- Category
ALTER TABLE "Category" ADD COLUMN IF NOT EXISTS "created_by" text;
--> statement-breakpoint
ALTER TABLE "Category" ADD COLUMN IF NOT EXISTS "updated_by" text;
--> statement-breakpoint
UPDATE "Category" SET "created_by" = "user_id", "updated_by" = "user_id" WHERE "created_by" IS NULL;
--> statement-breakpoint

-- Registration
ALTER TABLE "Registration" ADD COLUMN IF NOT EXISTS "created_by" text;
--> statement-breakpoint
ALTER TABLE "Registration" ADD COLUMN IF NOT EXISTS "updated_by" text;
--> statement-breakpoint
UPDATE "Registration" SET "created_by" = "user_id", "updated_by" = "user_id" WHERE "created_by" IS NULL;
--> statement-breakpoint

-- Submission
ALTER TABLE "Submission" ADD COLUMN IF NOT EXISTS "created_by" text;
--> statement-breakpoint
ALTER TABLE "Submission" ADD COLUMN IF NOT EXISTS "updated_by" text;
--> statement-breakpoint
UPDATE "Submission" SET "created_by" = "user_id", "updated_by" = "user_id" WHERE "created_by" IS NULL;
--> statement-breakpoint

-- SubmissionLink
ALTER TABLE "SubmissionLink" ADD COLUMN IF NOT EXISTS "created_by" text;
--> statement-breakpoint
ALTER TABLE "SubmissionLink" ADD COLUMN IF NOT EXISTS "updated_by" text;
--> statement-breakpoint
UPDATE "SubmissionLink" sl
SET "created_by" = s."user_id", "updated_by" = s."user_id"
FROM "Submission" s
WHERE sl."submission_id" = s."submission_id" AND sl."created_by" IS NULL;
--> statement-breakpoint

-- OTP
ALTER TABLE "OTP" ADD COLUMN IF NOT EXISTS "created_by" text;
--> statement-breakpoint
ALTER TABLE "OTP" ADD COLUMN IF NOT EXISTS "updated_by" text;
--> statement-breakpoint
ALTER TABLE "OTP" ADD COLUMN IF NOT EXISTS "updated_at" timestamp DEFAULT now();
--> statement-breakpoint

-- product
ALTER TABLE "product" ADD COLUMN IF NOT EXISTS "created_by" text;
--> statement-breakpoint
ALTER TABLE "product" ADD COLUMN IF NOT EXISTS "updated_by" text;
--> statement-breakpoint

-- Redemption
ALTER TABLE "Redemption" ADD COLUMN IF NOT EXISTS "created_by" text;
--> statement-breakpoint
ALTER TABLE "Redemption" ADD COLUMN IF NOT EXISTS "updated_by" text;
--> statement-breakpoint
ALTER TABLE "Redemption" ADD COLUMN IF NOT EXISTS "updated_at" timestamp DEFAULT now();
--> statement-breakpoint
UPDATE "Redemption" SET "created_by" = "user_id", "updated_by" = "user_id" WHERE "created_by" IS NULL;
--> statement-breakpoint

-- Juri
ALTER TABLE "Juri" ADD COLUMN IF NOT EXISTS "created_by" text;
--> statement-breakpoint
ALTER TABLE "Juri" ADD COLUMN IF NOT EXISTS "updated_by" text;
--> statement-breakpoint

-- Mission
ALTER TABLE "Mission" ADD COLUMN IF NOT EXISTS "created_by" text;
--> statement-breakpoint
ALTER TABLE "Mission" ADD COLUMN IF NOT EXISTS "updated_by" text;
--> statement-breakpoint

-- MissionSubmission
ALTER TABLE "MissionSubmission" ADD COLUMN IF NOT EXISTS "created_by" text;
--> statement-breakpoint
ALTER TABLE "MissionSubmission" ADD COLUMN IF NOT EXISTS "updated_by" text;
--> statement-breakpoint
UPDATE "MissionSubmission" SET "created_by" = "user_id", "updated_by" = "user_id" WHERE "created_by" IS NULL;
--> statement-breakpoint

-- AppSetting
ALTER TABLE "AppSetting" ADD COLUMN IF NOT EXISTS "created_by" text;
--> statement-breakpoint
ALTER TABLE "AppSetting" ADD COLUMN IF NOT EXISTS "updated_by" text;
