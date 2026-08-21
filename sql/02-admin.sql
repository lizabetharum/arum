-- Creates your admin account. Replace PASTE_HASH_HERE with the hash printed by:
--   node -e "console.log(require('bcryptjs').hashSync('your-password-here', 10))"
-- Run this in the Supabase SQL Editor after 01-schema.sql.
INSERT INTO "User" ("id", "email", "name", "passwordHash", "role", "createdAt")
VALUES ('admin_seed_0001', 'lizarum@gmail.com', 'Liz Arum', 'PASTE_HASH_HERE', 'admin', NOW())
ON CONFLICT ("email") DO UPDATE SET "passwordHash" = EXCLUDED."passwordHash", "role" = 'admin';
