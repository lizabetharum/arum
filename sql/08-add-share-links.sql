-- Share links: read-only links to one item, for people with no account.
--
-- Supabase dashboard -> SQL Editor -> New query -> paste -> Run.
-- Safe to run twice.
--
-- Until you run it, nothing changes: the Share panel says it needs this file,
-- and no link can be created. Existing items stay private either way — a link
-- exists only for an item you have explicitly shared.

CREATE TABLE IF NOT EXISTS "ItemShare" (
    "token" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ItemShare_pkey" PRIMARY KEY ("token")
);

-- One live link per item, so revoking really does close the door rather than
-- leaving a second forgotten link open.
CREATE UNIQUE INDEX IF NOT EXISTS "ItemShare_itemId_key" ON "ItemShare"("itemId");

DO $$ BEGIN
  ALTER TABLE "ItemShare" ADD CONSTRAINT "ItemShare_itemId_fkey"
    FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Same lockdown as every other table: RLS on with no policies, so Supabase's
-- anonymous REST API cannot read or mint share tokens.
ALTER TABLE "ItemShare" ENABLE ROW LEVEL SECURITY;
