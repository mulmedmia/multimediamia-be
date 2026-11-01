DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'Redemption' AND column_name = 'points_used'
  ) THEN
    ALTER TABLE "Redemption" RENAME COLUMN "points_used" TO "diamond_used";
  END IF;
END $$;
