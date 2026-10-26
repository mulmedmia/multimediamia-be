-- Migration 0027: Add optional admin_feedback to Submission table
ALTER TABLE "Submission" ADD COLUMN IF NOT EXISTS "admin_feedback" text;
