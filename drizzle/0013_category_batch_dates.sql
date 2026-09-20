ALTER TABLE "Category" ADD COLUMN IF NOT EXISTS "batch_1_start" timestamp;
--> statement-breakpoint
ALTER TABLE "Category" ADD COLUMN IF NOT EXISTS "batch_1_end" timestamp;
--> statement-breakpoint
ALTER TABLE "Category" ADD COLUMN IF NOT EXISTS "batch_2_start" timestamp;
--> statement-breakpoint
ALTER TABLE "Category" ADD COLUMN IF NOT EXISTS "batch_2_end" timestamp;
--> statement-breakpoint
UPDATE "Category"
SET "batch_1_start" = '2026-09-24 00:00:00',
    "batch_1_end" = '2026-10-05 23:59:59',
    "batch_2_start" = '2026-10-06 00:00:00',
    "batch_2_end" = '2026-10-16 23:59:59'
WHERE "slug" IN ('UIA', 'WIA');
