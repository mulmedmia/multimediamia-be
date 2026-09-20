CREATE TABLE IF NOT EXISTS "AppSetting" (
  "key" varchar(100) PRIMARY KEY NOT NULL,
  "value" text NOT NULL,
  "description" text,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
INSERT INTO "AppSetting" ("key", "value", "description")
VALUES ('guidebook_url', 'https://drive.google.com/drive/folders/1x34lDmoqSFdOfsxUpxpe2KiAaGT2zk5m?usp=sharing', 'Link Google Drive Guidebook Utama MIA 2026')
ON CONFLICT ("key") DO NOTHING;
