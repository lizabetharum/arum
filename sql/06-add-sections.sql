-- Sections and hand-set order for items.
--
-- Supabase dashboard -> SQL Editor -> New query -> paste -> Run.
-- Safe to run twice.
--
-- Until you run it, the site works exactly as before: items appear in one
-- ungrouped list, newest first, and the Section box is hidden.

ALTER TABLE "Item" ADD COLUMN IF NOT EXISTS "position" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Item" ADD COLUMN IF NOT EXISTS "section" TEXT NOT NULL DEFAULT '';

-- Give the items you already have a sensible starting order: oldest first, so
-- a project reads in the order it was built rather than all sharing position 0.
WITH ordered AS (
  SELECT id, row_number() OVER (PARTITION BY "projectId" ORDER BY "createdAt") AS n
  FROM "Item"
)
UPDATE "Item" SET "position" = ordered.n
FROM ordered
WHERE "Item".id = ordered.id AND "Item"."position" = 0;
