-- Adds Note items (typed content) to a library created before they existed.
-- Image items need no migration: an image is stored in the existing url column,
-- either as a link or as a data: URI holding the file.
-- Run once in the Supabase SQL Editor. Safe to re-run.
ALTER TABLE "Item" ADD COLUMN IF NOT EXISTS "body" TEXT NOT NULL DEFAULT '';
