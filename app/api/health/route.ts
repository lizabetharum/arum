// A setup diagnostic you can open in a browser.
//
// The app's own pages can't tell you why they failed — a server-side exception
// renders Next's generic error screen, and the real reason is in logs you may
// not be able to reach. This route answers the three questions that actually
// matter during setup: can the app reach Postgres, do the tables exist, and is
// there an admin account.
//
// It deliberately reports no data and no connection details — just which of
// those three steps is incomplete, plus a Prisma error code.
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

/** Error code only. Prisma messages can carry the database host; keep it out. */
function code(e: unknown): string {
  if (e instanceof Prisma.PrismaClientKnownRequestError) return e.code;
  if (e instanceof Prisma.PrismaClientInitializationError) return e.errorCode ?? "initialization_error";
  return e instanceof Error ? e.name : "unknown_error";
}

export async function GET() {
  if (!process.env.DATABASE_URL) {
    return Response.json(
      {
        ok: false,
        step: "environment",
        detail: "DATABASE_URL is not set in this deployment.",
        fix: "Add DATABASE_URL and DIRECT_URL in Vercel → Settings → Environment Variables, then redeploy. Environment variables are read at build time, so an existing deployment will not pick them up.",
      },
      { status: 503 },
    );
  }

  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch (e) {
    return Response.json(
      {
        ok: false,
        step: "connection",
        detail: "DATABASE_URL is set, but the database refused or dropped the connection.",
        errorCode: code(e),
        fix: "Check the connection string is the pooled one (port 6543, ending in ?pgbouncer=true) and that [YOUR-PASSWORD] was replaced with the real password.",
      },
      { status: 503 },
    );
  }

  let users: number;
  try {
    users = await prisma.user.count();
  } catch (e) {
    return Response.json(
      {
        ok: false,
        step: "schema",
        detail: "Connected to the database, but the tables do not exist yet.",
        errorCode: code(e),
        fix: "Run sql/01-schema.sql in the Supabase SQL Editor.",
      },
      { status: 503 },
    );
  }

  if (users === 0) {
    return Response.json(
      {
        ok: false,
        step: "admin",
        detail: "Tables exist, but there is no account to sign in with.",
        fix: "Run sql/02-admin.sql in the Supabase SQL Editor, with CHANGE-THIS-PASSWORD replaced.",
      },
      { status: 503 },
    );
  }

  return Response.json({ ok: true, step: "ready", detail: "Database reachable, tables present, at least one account exists." });
}
