/**
 * Strip the wrappers a page picks up on its way out of a browser.
 *
 * None of this is the author's content, and all of it is broken once the page
 * leaves the origin it was saved from — a <base href> silently rewrites every
 * relative URL, a chrome-extension:// stylesheet resolves for nobody, and
 * Claude's frame runtime talks to a parent shell that isn't there.
 *
 * Deliberately conservative: it removes only markup that is provably inert
 * elsewhere, and never touches the author's own scripts, styles, or markup.
 */
export function cleanStoredHtml(html: string): { html: string; removed: string[] } {
  const removed: string[] = [];
  let out = html;

  const strip = (re: RegExp, label: string) => {
    const before = out;
    out = out.replace(re, "");
    if (out !== before) removed.push(label);
  };

  // Claude wraps an artifact's real HTML in a runtime block: a <base href>
  // pointing at its own asset path, and a script that speaks postMessage to the
  // claude.ai shell. Removing it leaves the artifact itself intact.
  strip(/<!--\s*frame-runtime\s*-->[\s\S]*?<!--\s*\/frame-runtime\s*-->/gi, "Claude frame runtime");

  // Any surviving <base> would repoint every relative URL in the page.
  strip(/<base\b[^>]*>/gi, "<base> tag");

  // Browser extensions inject their own stylesheets and elements into a saved
  // page. Grammarly is the common one; the chrome-extension: rule catches the rest.
  strip(/<link[^>]*\bhref=["']chrome-extension:\/\/[^"']*["'][^>]*>/gi, "browser-extension stylesheets");
  strip(/<grammarly-([a-z-]+)\b[^>]*>[\s\S]*?<\/grammarly-\1>/gi, "Grammarly markup");
  strip(/<grammarly-[a-z-]+\b[^>]*\/?>/gi, "Grammarly markup");

  return { html: out, removed: Array.from(new Set(removed)) };
}

/**
 * True when the HTML is claude.ai's outer shell rather than an artifact.
 *
 * "Save page as HTML" on an artifact page saves the loader, which holds no
 * content at all — it fetches the artifact from Anthropic using the reader's
 * session. Nothing can be salvaged from it, so this is a warning, not a fix.
 */
export function looksLikeArtifactShell(html: string) {
  return html.includes("frame.claudeusercontent.com") || html.includes("data-frame-uuid");
}
