-- Creates your admin account. Runs entirely in the Supabase SQL Editor —
-- no Node, no database port, nothing installed locally.
--
-- 1. Replace CHANGE-THIS-PASSWORD below with the password you want to use.
-- 2. Run the whole file.
--
-- The password is hashed by Postgres itself (bcrypt, cost 10) before it is
-- stored, so the plain text never lands in a table. It does sit in your SQL
-- Editor history, though, so use a password you don't use elsewhere — you can
-- change it later from /admin/users in the app.

-- pgcrypto supplies crypt() and gen_salt(). Supabase installs it in the
-- "extensions" schema, so put that on the search path for this session.
CREATE EXTENSION IF NOT EXISTS pgcrypto;
SET search_path = public, extensions;

INSERT INTO "User" ("id", "email", "name", "passwordHash", "role", "createdAt")
VALUES (
  'admin_seed_0001',
  'lizarum@gmail.com',
  'Liz Arum',
  crypt('CHANGE-THIS-PASSWORD', gen_salt('bf', 10)),
  'admin',
  NOW()
)
ON CONFLICT ("email") DO UPDATE
  SET "passwordHash" = EXCLUDED."passwordHash",
      "role" = 'admin';

-- Re-running this file resets the password rather than failing.
SELECT "email", "role", 'account ready — sign in with the password above' AS status
FROM "User" WHERE "email" = 'lizarum@gmail.com';
