-- Migration 0017: Add is_show_it_open to Category
ALTER TABLE "Category" ADD COLUMN IF NOT EXISTS "is_show_it_open" boolean DEFAULT false NOT NULL;
