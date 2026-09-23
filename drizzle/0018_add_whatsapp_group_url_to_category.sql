-- Migration 0018: Add whatsapp_group_url to Category
ALTER TABLE "Category" ADD COLUMN IF NOT EXISTS "whatsapp_group_url" text;
