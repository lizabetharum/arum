# Artifact Library

A private, password-protected website for storing and presenting artifacts —
debriefs, ideas, best practices, research, and presentations — organized by
project and topic, and searchable.

## How access works

- Everyone signs in with an **email + password** account that an admin creates.
  There are no public pages and no self-signup.
- **Projects are the walls.** A person only sees the projects they've been added
  to. Someone with access to one project directory sees nothing of the others —
  not in lists, not in search.
- **Items can be restricted further.** Any item can be marked **restricted**, and
  then only the specific people you grant it to (plus admins) can see it, even
  inside a project they belong to.
- **Admins** see everything and manage people, projects, and items at `/admin`.

## Item kinds

| Kind | How it's shown |
| --- | --- |
| Google Doc / Sheet / Slides | Embedded viewer (paste the normal `/edit` URL; it's converted automatically) |
| HTML page | Stored in the database, served behind the same access check |
| Link | A plain outbound link |

> **Google caveat:** the embed is loaded by the viewer's browser directly from
> Google, so Google's own sharing still applies. Share the doc with the same
> people (or set it to "anyone with the link can view") — otherwise they'll see
> Google's access-denied screen inside the frame. This site controls who can
> *find* an item; it can't bypass Google permissions.

Every item has a **category** (debrief, idea, best practice, research,
presentation, other) and free-form **topics** (tags). Project pages filter by
both; the search box matches titles, descriptions, and topics across everything
the signed-in person is allowed to see.

## One-time setup

### 1. Database (Supabase)

1. Create a free project at [supabase.com](https://supabase.com). Save the
   database password.
2. Dashboard → **Connect** → **ORMs** (or **Connection string → URI**). Copy two
   strings:
   - **Transaction / pooled** (port `6543`, has `pgbouncer=true`) → `DATABASE_URL`
   - **Session / direct** (port `5432`) → `DIRECT_URL`

### 2. Create the tables and your admin account

```bash
npm install
cp .env.example .env        # paste in the real DATABASE_URL / DIRECT_URL
npm run db:push             # creates the tables, then enables RLS
ADMIN_PASSWORD='choose-one' npm run db:seed
```

`db:seed` creates the admin account (`ADMIN_EMAIL`, default `lizarum@gmail.com`)
and, on an empty database, one sample project. Re-running it never changes an
existing account's password.

### 3. Deploy (Vercel)

The Vercel project builds from this repo's root. Add `DATABASE_URL` and
`DIRECT_URL` as Environment Variables (Production **and** Preview), then deploy.
`prisma generate` runs automatically via `postinstall`.

## Security notes

- **Row-Level Security is not optional here.** Supabase publishes a REST API over
  your tables to anyone holding the project's anon key. A table without RLS is
  readable through it — which would expose every restricted item and every
  password hash, straight past this app's access rules. The app talks to Postgres
  as the owner role (which bypasses RLS), so deny-by-default RLS closes that API
  and costs the app nothing.
  - `npm run db:push` enables it automatically.
  - After any schema change that adds a table, run `npm run db:rls`.
  - `npm run db:rls:check` reports unprotected tables and exits non-zero — use it
    in CI if you add one.
  - Belt and braces: in the Supabase dashboard you can also disable the Data API
    entirely, or drop `public` from the exposed schemas.
- Passwords are bcrypt-hashed. Sessions are httpOnly cookies, 30 days, and
  changing someone's password signs them out everywhere.
- Never commit `.env` — `.gitignore` already covers it.

## Day-to-day

- `/admin/users` — add people, reset passwords, delete accounts.
- `/admin/projects` — create projects, add/remove members, add items.
- To restrict an item: open it in the admin area, tick **Restricted**, save, then
  check the members who should keep access.
- Removing someone from a project also removes their per-item grants there.

## Local development

```bash
npm install
npm run dev     # http://localhost:3000
```

`npm run db:studio` opens Prisma Studio to inspect the database directly.
