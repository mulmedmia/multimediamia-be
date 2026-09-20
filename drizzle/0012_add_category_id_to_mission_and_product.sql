ALTER TABLE "Mission" ADD COLUMN IF NOT EXISTS "category_id" text REFERENCES "Category"("category_id") ON DELETE CASCADE;
ALTER TABLE "product" ADD COLUMN IF NOT EXISTS "category_id" text REFERENCES "Category"("category_id") ON DELETE CASCADE;

-- Associate existing missions and products with the first created category
UPDATE "Mission"
SET "category_id" = (SELECT category_id FROM "Category" ORDER BY created_at ASC LIMIT 1)
WHERE "category_id" IS NULL;

UPDATE "product"
SET "category_id" = (SELECT category_id FROM "Category" ORDER BY created_at ASC LIMIT 1)
WHERE "category_id" IS NULL;
