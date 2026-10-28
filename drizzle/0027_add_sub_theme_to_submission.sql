-- Migration 0027: Add sub_theme to Submission table
ALTER TABLE "Submission" ADD COLUMN IF NOT EXISTS "sub_theme" text;
