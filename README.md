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
| HTML page | Choose a `.html` file or paste the markup; stored in the database, served behind the same access check, and editable here afterwards |
| Link | A plain outbound link |

### Saving a Claude Artifact

The artifact viewer has no download button — its header offers Share and nothing
else. The page can't be fetched from a server either: the content loads in the
browser from your Claude session, so a server request returns claude.ai's app
shell. (The download button described in Claude's help articles belongs to
artifacts created inside a claude.ai conversation, which is a different surface
from a Claude Code artifact.)

Three routes that do work, easiest first:

**1. Just ask, in a Claude Code session.** This is the one that needs nothing
installed and no developer tools. Start a session — the web one at
[claude.ai/code](https://claude.ai/code) is fine — and say:

```
Give me the HTML for my "Velocity Arena Pathway" artifact as a file.
```

Claude can list and read the artifacts you own, and hands back a file for the
picker. If you have the artifact's URL already, that works too:

```
Read https://claude.ai/code/artifact/<uuid> and save its HTML to pathway.html
```

**2. `/artifacts`, if you use the Claude Code CLI or desktop app.** That command
belongs to those surfaces — it is *not* available in Claude Code on the web,
which answers `/artifacts isn't available in this environment`. Where it does
run: type `/artifacts`, arrow to the artifact, press **Enter** to attach it to
the session (`o` opens a browser, `c` copies the link — neither gets you the
file), then ask Claude to save its HTML to a file. Needs v2.1.208 or later for
the command and v2.1.216 or later for Enter to attach; check with
`claude --version`.

**3. The original file.** Claude Code writes the page to an `.html` file in your
project *before* publishing it, so the clean source is often already on disk in
the project where you created it. Search that folder for a `.html` file named
after the artifact.

Copying out of the browser also works, but it is the fiddly option, because you
need the `<html>` *inside* the artifact's `<iframe>` rather than the page around
it — copying the outer document gives you a loader with no content in it, which
the editor and the item page both warn about.

- **Chrome / Edge**: right-click inside the artifact content → *View Frame
  Source* → select all → copy. Firefox: *This Frame → View Frame Source*.
- **Safari**: Settings → Advanced → tick *Show features for web developers*, then
  right-click inside the artifact → *Inspect Element*, expand the artifact's
  `<iframe>` to the `<html>` inside it, and right-click that → *Copy* → *Outer
  HTML*.

Claude's frame wrapper is stripped automatically on save, so there is never
anything to trim by hand.

### Editing an HTML item

Open the item, click **Edit**, and the HTML box becomes a two-pane editor: markup
on the left, a live preview on the right that repaints as you type. The preview
uses the same sandbox readers get, so what you see is what they get. Save applies
the change immediately.

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

Open **`/api/health`** on the deployed site first — e.g.
`https://your-domain/api/health`. It reports which setup step is incomplete and
what to do about it, without needing access to the logs:

| `step` | Meaning |
| --- | --- |
| `environment` | `DATABASE_URL` isn't in the deployment. Add it, then redeploy. |
| `connection` | The variable is set but the database refused the connection. |
| `schema` | Connected, but the tables don't exist — run the schema (`db:push`, or `sql/01-schema.sql`). |
| `admin` | Tables exist but there's no account — run the seed (`db:seed`, or `sql/02-admin.sql`). |
| `ready` | All three are done; you can sign in. |

It reports no data and no connection details, only which step is incomplete.



| Symptom | Cause and fix |
| --- | --- |
| `db:push` hangs or says it can't reach the server | Your network may be IPv4-only, which the direct connection doesn't support. In Supabase's Connect dialog, use the **Session pooler** string (port `5432`, host contains `pooler`) as `DIRECT_URL`. |
| `Authentication failed` on `db:push` | `[YOUR-PASSWORD]` is still in the connection string, or the password was mistyped. Re-copy from step 1. |
| Site loads but every page is a 500 | The env vars aren't in the build. Confirm both exist in Vercel Settings, then redeploy (step 4). |
| `No account with that email` at sign-in | `db:seed` hasn't run, or ran against a different database than Vercel points at. Check `.env` matches the Vercel values. |
| Build fails | Send the build log — the app builds without a database, so a build failure is something else. |

## Comments

Anyone who can open an item can comment on it, and comments inherit that item's
visibility: restrict an item and its discussion disappears with it, from the
page and from the exports.

- **On any item** — Google Doc, Sheet, Slides, link, HTML — there's a comment
  box below it. Threads have replies, and either party can **Resolve** a thread
  (which greys it out rather than deleting it) or **Reopen** it later.
- **On HTML items**, select any text in the page and a **Comment** button
  appears. The quote is highlighted, a numbered badge sits in the margin, and
  clicking either jumps to that thread. Commenters are identified by their
  login — there are no reviewer links or tokens to hand out.
- **Download as spreadsheet** on any item gives a CSV of its comments; the same
  thing at `/admin/comments.csv` gives every comment you're allowed to see,
  across all projects. Both open directly in Sheets or Excel.

Columns: Thread, Comment ID, Timestamp, Author, Comment, Status, Project, Item,
Section, Quoted text, Prefix, Suffix. Section is the nearest heading above the
quote, so a long document sorts by part.

Anchors are the quoted words plus about 40 characters either side — not a line
or character position — so editing one part of a page doesn't move the comments
on another. If the quoted wording is rewritten, the thread isn't lost: it stays
in the list with its original quote and a note under the page saying it no
longer matches, it just has nothing left to highlight.

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
