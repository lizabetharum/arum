/**
 * Turn a pasted Google URL (the /edit link people copy from the address bar)
 * into the embeddable form for an iframe. Unrecognized URLs pass through
 * unchanged. Google's own sharing still applies on top of this: the viewer's
 * browser fetches the document from Google, so the doc must be shared with
 * them there (or set to "anyone with the link").
 */
export function embedUrl(kind: string, url: string): string {
  const m = url.match(
    /^(https:\/\/docs\.google\.com\/(?:document|spreadsheets|presentation)\/d\/(?:e\/)?[^/?#]+)/,
  );
  if (!m) return url;
  const base = m[1];
  if (kind === "google_slides") return `${base}/embed?start=false&loop=false`;
  return `${base}/preview`;
}
