-- Migration 0033: Add is_finalist flag to Submission table for Top 10 Finalist showcase
ALTER TABLE "Submission" ADD COLUMN IF NOT EXISTS "is_finalist" boolean DEFAULT false NOT NULL;
