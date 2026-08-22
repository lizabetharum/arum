---
name: artifact-export
description: Export a Claude Artifact as a clean, self-contained .html file saved to disk. Use this whenever someone wants an artifact as a file, a download, or its raw HTML — including "download my artifact", "get the HTML for X", "save that artifact as a file", "export my artifacts", "I need the source of my artifact", or when they want to put an artifact somewhere else (a website, a library, a repo, an email). Also use it when someone reports that the artifact viewer has no download button, that copying the page gave them a loader or a blank spinner, or that a saved artifact will not render outside claude.ai — this skill is the fix for all of those.
---

# Export an artifact as a clean HTML file

The artifact viewer offers Share and nothing else — there is no download button,
and its page cannot be fetched from a server, because the content loads in the
browser from the reader's own Claude session. So people reach for "Save page as
HTML", which saves the loader instead of the artifact and produces a file that
shows a spinner forever.

None of that is necessary. The `Artifact` tool reads artifacts the user owns
directly. This skill turns that into a file they can use anywhere.

## The procedure

**1. Find the artifact.** If the request names one, or gives a URL, go straight
to step 2. Otherwise list what they have:

```
Artifact(action: "list", scope: "mine", limit: 25)
```

Match on title. If several could fit, show the candidates with their dates and
ask which — guessing wastes their time more than a question does.

**2. Read it.** Use the URL from the listing:

```
Artifact(action: "read", url: "https://claude.ai/code/artifact/<uuid>")
```

An artifact the user owns comes back as raw HTML. Anything above roughly 30KB is
written to a local file instead, and the result names that path — read the file
rather than working from the excerpt in the result, which is only the head.

**3. Strip the wrapper.** What comes back is the artifact wrapped in Claude's
frame runtime: a `<base href>` pointing at claude.ai's asset path, and a script
that talks to the claude.ai shell over postMessage. Both are inert or harmful
anywhere else — the `<base>` in particular silently repoints every relative URL
in the page. Run `scripts/clean_artifact.py`:

```bash
python3 scripts/clean_artifact.py <source.html> <output.html>
```

It removes the `<!-- frame-runtime -->` block, any surviving `<base>` tag, and
browser-extension debris, then reports what it removed and what remains. It
leaves the author's own scripts, styles, and markup untouched — an ordinary page
comes back byte-identical.

**4. Check it is really the artifact.** The script prints these; read them
rather than assuming:

- **Contains recognisable content** — a heading or sentence from the artifact.
- **No `data-frame-uuid`, no `frame.claudeusercontent.com`.** Either means the
  loader shell, which holds no content at all and cannot be salvaged. If that
  happens, the read returned the wrong document — go back to step 2 rather than
  handing over a file that will never render.
- **No `<base>` tags.**

**5. Hand it over.** Save it next to where they will use it, named after the
artifact (`velocity-arena-pathway.html`, not `artifact.html`). If a tool for
sending files to the user is available, send it; otherwise give the full path.

Say what the file is and what was removed, briefly — for example: "59 KB,
Claude's frame runtime stripped, opens standalone." That is what tells them it
will work somewhere else.

## Several at once

When someone asks for all of them, or several, list once and loop steps 2–4.
Report as a short list — one line per artifact with its size — rather than
narrating each. If one fails, say which and why, and still deliver the rest.

## What this cannot do

- **Artifacts the user does not own.** A shared artifact comes back as a summary,
  not HTML. Say so instead of producing a file from the summary.
- **Fetching by URL from a server.** `curl` on an artifact URL returns claude.ai's
  app shell. Only the `Artifact` tool reads the real content.
- **Round-tripping edits.** The exported file is a snapshot. Editing it does not
  change the artifact, and republishing the artifact does not update the file.
  Say this once when it matters — someone putting the file in a site they will
  maintain needs to know it will drift.
