-- Attachments: several extra files on one item, such as the images from a
-- webinar alongside its transcript.
--
-- Supabase dashboard -> SQL Editor -> New query -> paste -> Run.
-- Safe to run twice.
--
-- Until you run it, everything else works as before. The Attachments panel on
-- an item's edit page says it needs this file, and uploads are refused.
--
-- The bytes live in their own table, as PDFs do in ItemFile, so project pages,
-- search and card lists never read them.

CREATE TABLE IF NOT EXISTS "ItemAttachment" (
    "id" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "filename" TEXT NOT NULL DEFAULT '',
    "mimeType" TEXT NOT NULL DEFAULT 'application/octet-stream',
    "size" INTEGER NOT NULL,
    "caption" TEXT NOT NULL DEFAULT '',
    "data" BYTEA NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ItemAttachment_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "ItemAttachment_itemId_createdAt_idx"
    ON "ItemAttachment"("itemId", "createdAt");

DO $$ BEGIN
  ALTER TABLE "ItemAttachment" ADD CONSTRAINT "ItemAttachment_itemId_fkey"
    FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Same lockdown as every other table: RLS on with no policies, so Supabase's
-- anonymous REST API cannot serve these files past the app's access rules.
ALTER TABLE "ItemAttachment" ENABLE ROW LEVEL SECURITY;
