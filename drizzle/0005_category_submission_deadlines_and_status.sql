ALTER TABLE "Category" ADD COLUMN IF NOT EXISTS "preliminary_deadline" timestamp;
--> statement-breakpoint
ALTER TABLE "Category" ADD COLUMN IF NOT EXISTS "final_deadline" timestamp;
--> statement-breakpoint
ALTER TABLE "Category" ADD COLUMN IF NOT EXISTS "is_submission_open" boolean DEFAULT true NOT NULL;
--> statement-breakpoint
ALTER TABLE "Category" ADD COLUMN IF NOT EXISTS "allow_revision" boolean DEFAULT false NOT NULL;
--> statement-breakpoint
UPDATE "Category" 
SET "preliminary_deadline" = COALESCE("preliminary_deadline", "deadline"),
    "final_deadline" = COALESCE("final_deadline", "deadline")
WHERE "preliminary_deadline" IS NULL OR "final_deadline" IS NULL;
