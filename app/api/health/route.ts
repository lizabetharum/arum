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
import { getCurrentUser } from "@/lib/auth";

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

  // Each later migration adds a column or table that some part of the app
  // needs. Asked of the catalogue with raw SQL rather than through Prisma, so
  // that a missing column is reported by name instead of throwing the same
  // opaque error the pages would.
  const pending: { file: string; adds: string; until: string }[] = [];
  const hasColumn = async (table: string, column: string) => {
    const rows = await prisma.$queryRaw<{ n: bigint }[]>`
      SELECT count(*) AS n FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = ${table} AND column_name = ${column}`;
    return Number(rows[0]?.n ?? 0) > 0;
  };
  const hasTable = async (table: string) => {
    const rows = await prisma.$queryRaw<{ n: bigint }[]>`
      SELECT count(*) AS n FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = ${table}`;
    return Number(rows[0]?.n ?? 0) > 0;
  };

  if (!(await hasTable("Comment"))) {
    pending.push({
      file: "sql/03-add-comments.sql",
      adds: "the Comment table",
      until: "Comments stay hidden everywhere.",
    });
  }
  if (!(await hasColumn("Item", "body"))) {
    pending.push({
      file: "sql/04-add-notes-and-images.sql",
      adds: "Item.body",
      until: "Notes save with no text in them.",
    });
  }
  if (!(await hasColumn("User", "inviteToken"))) {
    pending.push({
      file: "sql/05-add-invites.sql",
      adds: "User.inviteToken and User.inviteExpiresAt",
      until: "Adding a person fails and invite links do not appear.",
    });
  }

  if (!(await hasColumn("Item", "section"))) {
    pending.push({
      file: "sql/06-add-sections.sql",
      adds: "Item.section and Item.position",
      until: "Projects stay one ungrouped list and the Section box is hidden.",
    });
  }

  if (pending.length > 0) {
    return Response.json(
      {
        ok: false,
        step: "migrations",
        detail: `Signing in works, but ${pending.length} database update${
          pending.length === 1 ? " has" : "s have"
        } not been run yet.`,
        pending,
        fix: "Open each file listed above in the repo, paste it into the Supabase SQL Editor, and Run. They are safe to run twice.",
      },
      { status: 503 },
    );
  }

  // Counts answer the question "is my content actually there?", which is what
  // people are really asking when a page looks emptier than they expected. They
  // are only shown to someone signed in: an unauthenticated caller gets enough
  // to see the app is healthy and nothing about what it holds.
  const viewer = await getCurrentUser();
  if (!viewer) {
    return Response.json({
      ok: true,
      step: "ready",
      detail: "Database reachable, tables present, at least one account exists. Sign in and reload for content counts.",
    });
  }

  const [projects, items, comments] = await Promise.all([
    prisma.project.count(),
    prisma.item.count(),
    prisma.comment.count().catch(() => 0),
  ]);

  return Response.json({
    ok: true,
    step: "ready",
    detail: "Database reachable, tables present, at least one account exists.",
    contents: { projects, items, comments, users },
    note:
      items === 0
        ? "No items exist yet — projects can be created and still be empty. If you expected items here, they were deleted rather than hidden: this count ignores access rules."
        : undefined,
  });
}
