# Browser-only setup (no Postgres port, no Node)

Use these when `npm run db:push` fails with **P1001: Can't reach database
server**. That error means your network blocks outbound Postgres ports (5432 and
6543) — routine on school and corporate networks, and nothing you can fix from
that machine. Supabase's SQL Editor runs over HTTPS, which is never blocked, so
the same setup goes in through the browser instead.

Your Vercel deployment is unaffected either way: Vercel's servers have open
egress and connect to Supabase normally. This is only about your own machine.

## 1. Create the tables

Supabase dashboard → **SQL Editor** → **New query**. Paste all of
`01-schema.sql`, click **Run**.

Creates all the tables and enables Row-Level Security on each — the same lockdown
`npm run db:push` applies. Expect "Success. No rows returned."

## 2. Create your admin account

Open `02-admin.sql`, replace `CHANGE-THIS-PASSWORD` with the password you want,
paste the whole file into a new query, and **Run**.

Postgres hashes the password itself (bcrypt via pgcrypto) before storing it, so
no plain text is written to any table and nothing has to be installed locally.
The password does stay in your SQL Editor history, so pick one you don't reuse —
you can change it later from `/admin/users` in the app.

Expect one row back reading `account ready`. Re-running the file resets the
password rather than failing.

## 3. Sign in

Open your deployment URL and sign in as `lizarum@gmail.com`. You'll land on an
empty Projects page — create your first project from `/admin/projects`.

## Later changes

Each numbered file after `02` adds something to a database that already exists.
Run them the same way — SQL Editor → New query → paste → **Run** — in order, and
only the ones you have not run yet. All are safe to run twice.

| File | Adds | Until you run it |
| --- | --- | --- |
| `03-add-comments.sql` | The `Comment` table | Comments are hidden everywhere |
| `04-add-notes-and-images.sql` | `Item.body` | Notes save empty |
| `05-add-invites.sql` | `User.inviteToken`, `User.inviteExpiresAt` | "Add a person" fails |
| `06-add-sections.sql` | `Item.section`, `Item.position` | Projects stay one ungrouped list |
| `07-add-pdfs.sql` | The `ItemFile` table | Uploading a PDF is refused |

`/api/health` lists by name any of these you have not run yet.

## Keeping these in sync

`01-schema.sql` is generated from `prisma/schema.prisma`. If the schema changes,
regenerate the table section with:

```bash
npx prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script
```

then re-append the `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` block at the end.
