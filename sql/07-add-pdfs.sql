-- Uploaded PDFs.
--
-- Supabase dashboard -> SQL Editor -> New query -> paste -> Run.
-- Safe to run twice.
--
-- Until you run it, everything else works as before; only saving a PDF is
-- refused, with a message pointing back here.
--
-- The bytes live in their own table rather than a column on Item, so that
-- project pages, search and card lists -- which read whole Item rows -- never
-- drag a document's megabytes along with them.

CREATE TABLE IF NOT EXISTS "ItemFile" (
    "itemId" TEXT NOT NULL,
    "filename" TEXT NOT NULL DEFAULT '',
    "mimeType" TEXT NOT NULL DEFAULT 'application/pdf',
    "size" INTEGER NOT NULL,
    "data" BYTEA NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ItemFile_pkey" PRIMARY KEY ("itemId")
);

DO $$ BEGIN
  ALTER TABLE "ItemFile" ADD CONSTRAINT "ItemFile_itemId_fkey"
    FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Same lockdown as every other table: RLS on with no policies, so Supabase's
-- anonymous REST API cannot serve these files past the app's access rules.
ALTER TABLE "ItemFile" ENABLE ROW LEVEL SECURITY;
