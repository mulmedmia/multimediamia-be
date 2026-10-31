ALTER TABLE "product" ADD COLUMN "max_redeem_per_team" integer DEFAULT 0 NOT NULL;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'product' AND column_name = 'is_single_redeem'
  ) THEN
    UPDATE "product" SET "max_redeem_per_team" = 1 WHERE "is_single_redeem" = true;
    ALTER TABLE "product" DROP COLUMN "is_single_redeem";
  END IF;
END $$;
