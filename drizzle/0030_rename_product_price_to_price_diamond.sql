DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'product' AND column_name = 'price'
  ) THEN
    ALTER TABLE "product" RENAME COLUMN "price" TO "price_diamond";
  END IF;
END $$;
