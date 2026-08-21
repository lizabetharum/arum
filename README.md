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

Do these in order. Steps 1–2 are in the browser; step 3 is in a terminal on your
own machine.

### 1. Create the database (Supabase)

1. Go to [supabase.com](https://supabase.com) and sign in.
2. Click **New project**.
3. Fill in:
   - **Name** — anything, e.g. `artifact-library`
   - **Database Password** — click *Generate a password* and **copy it somewhere
     safe now**. You cannot see it again, and you need it in step 2.
   - **Region** — pick the one closest to you.
4. Click **Create new project** and wait ~2 minutes while it provisions.
5. When it finishes, click the **Connect** button in the top bar of the dashboard.
6. In the dialog, open the **ORMs** tab and choose **Prisma** from the dropdown.
   It shows a block containing `DATABASE_URL` and `DIRECT_URL`.
7. Copy both values. **Replace `[YOUR-PASSWORD]` in each one with the password
   from step 3** — Supabase shows a placeholder, not the real password.

You should end up with two strings that look like this:

```
DATABASE_URL  postgresql://postgres.abcd:REALPASSWORD@aws-0-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true
DIRECT_URL    postgresql://postgres.abcd:REALPASSWORD@aws-0-us-east-1.pooler.supabase.com:5432/postgres
```

Check before moving on: one ends in **6543** with `?pgbouncer=true`, the other
ends in **5432**. If you only see one string, you are on the *Connection string*
tab rather than *ORMs* — switch tabs.

### 2. Add them to Vercel

1. Open your project at
   [vercel.com/liz-arums-projects/arum](https://vercel.com/liz-arums-projects/arum).
2. Click **Settings** (top nav), then **Environment Variables** (left sidebar).
3. Add the first variable:
   - **Key**: `DATABASE_URL`
   - **Value**: the `6543` string from step 1
   - **Environments**: tick **Production**, **Preview**, and **Development**
   - Click **Save**
4. Add the second the same way:
   - **Key**: `DIRECT_URL`
   - **Value**: the `5432` string
   - Same three environments, then **Save**

### 3. Create the tables and your admin login

In a terminal on your own machine:

```bash
git clone https://github.com/lizabetharum/arum
cd arum
npm install
cp .env.example .env
```

Open `.env` in an editor and replace the two placeholder lines with the real
strings from step 1. Save and close. Then:

```bash
npm run db:push
```

Expect it to end with something like `✓ RLS enforced — 8 newly enabled, all 8
tables protected.` Then create your admin account, choosing your own password:

```bash
ADMIN_PASSWORD='your-password-here' npm run db:seed
```

Expect `Admin: lizarum@gmail.com (created)` and `Created sample project: Sandbox`.

### 4. Deploy and sign in

1. Back in Vercel, open the **Deployments** tab.
2. On the most recent deployment, click the **⋯** menu → **Redeploy** →
   **Redeploy**. (Environment variables are only read at build time, so the
   deployment made before step 2 does not have them.)
3. When it goes green, open the deployment URL and sign in with
   `lizarum@gmail.com` and the password you chose in step 3.

You should land on a page listing one project, **Sandbox**. That is the sample
project — rename or delete it from `/admin/projects` once you are oriented.

### If something goes wrong

| Symptom | Cause and fix |
| --- | --- |
| `db:push` hangs or says it can't reach the server | Your network may be IPv4-only, which the direct connection doesn't support. In Supabase's Connect dialog, use the **Session pooler** string (port `5432`, host contains `pooler`) as `DIRECT_URL`. |
| `Authentication failed` on `db:push` | `[YOUR-PASSWORD]` is still in the connection string, or the password was mistyped. Re-copy from step 1. |
| Site loads but every page is a 500 | The env vars aren't in the build. Confirm both exist in Vercel Settings, then redeploy (step 4). |
| `No account with that email` at sign-in | `db:seed` hasn't run, or ran against a different database than Vercel points at. Check `.env` matches the Vercel values. |
| Build fails | Send the build log — the app builds without a database, so a build failure is something else. |

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
