-- Migration 0034: Add composite index for Show It & Beranda Top 10 Finalist queries
CREATE INDEX IF NOT EXISTS "idx_submission_show_it_finalist" ON "Submission" ("status", "is_verified", "is_finalist", "created_at" DESC);
