-- Migration 0026: Add thumbnail_url to Submission table
ALTER TABLE "Submission" ADD COLUMN IF NOT EXISTS "thumbnail_url" text;
