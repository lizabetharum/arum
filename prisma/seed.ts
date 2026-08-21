// Creates the first admin account (and a small sample project on an empty
// database). Safe to re-run: the admin is upserted, the sample project is only
// created when no projects exist yet.
//
// Usage:  ADMIN_EMAIL=you@example.com ADMIN_PASSWORD=... npm run db:seed
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";

const prisma = new PrismaClient();

async function main() {
  const email = (process.env.ADMIN_EMAIL ?? "lizarum@gmail.com").trim().toLowerCase();
  let password = process.env.ADMIN_PASSWORD;
  let generated = false;
  if (!password) {
    password = randomBytes(9).toString("base64url");
    generated = true;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const admin = await prisma.user.upsert({
    where: { email },
    // An existing account keeps its password — only the role is enforced,
    // so re-seeding never silently locks the admin out of a password she set.
    update: { role: "admin" },
    create: { email, name: "Liz Arum", passwordHash, role: "admin" },
  });

  const created = admin.createdAt.getTime() > Date.now() - 10_000;
  console.log(`Admin: ${email} (${created ? "created" : "already existed — password unchanged"})`);
  if (created && generated) {
    console.log(`Generated password: ${password}`);
    console.log("Log in with it, or re-run with ADMIN_PASSWORD set.");
  }

  if ((await prisma.project.count()) === 0) {
    const project = await prisma.project.create({
      data: {
        slug: "sandbox",
        name: "Sandbox",
        description: "A first project to try things out. Rename or delete it from the admin area.",
        members: { create: { userId: admin.id } },
      },
    });
    await prisma.item.create({
      data: {
        projectId: project.id,
        title: "Welcome to your Artifact Library",
        kind: "html",
        category: "best_practice",
        htmlContent: `<!doctype html><html><head><meta charset="utf-8"><style>body{font-family:Georgia,serif;max-width:38rem;margin:4rem auto;line-height:1.6;color:#333}</style></head><body><h1>It works.</h1><p>This page is an <strong>HTML item</strong> stored in the database. From the admin area you can add Google Docs, Sheets, and Slides by URL, or paste whole HTML pages like this one.</p><p>Each project has its own members; each item can additionally be restricted to specific people.</p></body></html>`,
        tags: { create: [{ tag: { connectOrCreate: { where: { name: "getting-started" }, create: { name: "getting-started" } } } }] },
      },
    });
    console.log("Created sample project: Sandbox");
  }

  // Close Supabase's anonymous REST API over these tables. The app reaches Postgres
  // as the owner role (which bypasses RLS), so deny-by-default costs it nothing.
  // See scripts/enforce-rls.ts for why this matters.
  const tables: { tablename: string }[] = await prisma.$queryRawUnsafe(
    "select tablename from pg_tables where schemaname = 'public' and rowsecurity = false",
  );
  for (const { tablename } of tables) {
    await prisma.$executeRawUnsafe(`ALTER TABLE "${tablename}" ENABLE ROW LEVEL SECURITY;`);
  }
  if (tables.length) console.log(`Enabled Row-Level Security on ${tables.length} table(s).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
