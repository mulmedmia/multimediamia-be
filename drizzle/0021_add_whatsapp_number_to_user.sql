-- Migration 0021: Add whatsapp_number to User
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "whatsapp_number" text;
