// Enforce Row-Level Security on every table in the public schema.
//
// WHY: Supabase auto-publishes a REST API over your tables using an anonymous key. A table WITHOUT
// RLS is readable/writable through that API by anyone who has the project URL — which would hand
// out every restricted Item and every password hash, straight past the access rules in lib/access.ts.
// This app never uses that API: it reaches Postgres via Prisma as the OWNER role, which BYPASSES
// RLS. So enabling deny-by-default RLS closes the anonymous API without affecting the app at all.
//
// prisma/seed.ts enables RLS on all tables, but a `prisma db push` that ADDS a table does not
// re-run the seed, so a new table ships exposed until the next seed. Run this after every push.
//
//   npm run db:rls          enable RLS on any public table missing it (idempotent)
//   npm run db:rls:check    report unprotected tables and exit 1 — makes NO changes (for CI)
//
// NOTE: this acts on whatever DATABASE_URL points at (i.e. production, via .env). That is the point.

import "dotenv/config";
import { prisma } from "../lib/db";

async function main() {
  const check = process.argv.includes("--check");
  const rows: { tablename: string; rowsecurity: boolean }[] = await prisma.$queryRawUnsafe(
    "select tablename, rowsecurity from pg_tables where schemaname = 'public' order by tablename"
  );
  const missing = rows.filter((r) => !r.rowsecurity).map((r) => r.tablename);

  if (check) {
    if (missing.length) {
      console.error(`✗ RLS: ${missing.length} public table(s) WITHOUT Row-Level Security: ${missing.join(", ")}`);
      console.error("  Exposed to Supabase's anonymous REST API. Run `npm run db:rls` to fix.");
      process.exit(1);
    }
    console.log(`✓ RLS: all ${rows.length} public tables have Row-Level Security.`);
    process.exit(0);
  }

  if (!missing.length) {
    console.log(`✓ RLS already on all ${rows.length} public tables — nothing to do.`);
    process.exit(0);
  }
  for (const t of missing) {
    // Table names come from pg_catalog (not user input) and are quoted; safe to interpolate.
    await prisma.$executeRawUnsafe(`ALTER TABLE "${t}" ENABLE ROW LEVEL SECURITY;`);
    console.log("  enabled RLS on " + t);
  }
  console.log(`✓ RLS enforced — ${missing.length} newly enabled, all ${rows.length} tables protected.`);
  process.exit(0);
}

main().catch((e) => {
  console.error("enforce-rls failed:", e && e.message ? e.message : e);
  process.exit(1);
});
