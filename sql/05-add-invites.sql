-- Invite links: two new columns on the People table.
--
-- Run this the same way as the others: Supabase dashboard -> SQL Editor ->
-- New query -> paste -> Run. Safe to run twice.
--
-- Until you run it, "Add a person" will fail. Everything else keeps working.

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "inviteExpiresAt" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "inviteToken" TEXT;

-- One account per link. Postgres lets a unique index hold any number of NULLs,
-- so the accounts with no outstanding invite do not collide with each other.
CREATE UNIQUE INDEX IF NOT EXISTS "User_inviteToken_key" ON "User"("inviteToken");
