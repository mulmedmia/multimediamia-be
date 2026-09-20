ALTER TABLE "Category" RENAME COLUMN "category_name" TO "slug";
--> statement-breakpoint
UPDATE "Category" SET "slug" = LOWER("slug");
--> statement-breakpoint
ALTER TABLE "Category" DROP COLUMN IF EXISTS "title";
