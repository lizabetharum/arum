export const SITE_NAME = "Arum Solutions";

export const CATEGORIES = [
  { value: "debrief", label: "Debrief" },
  { value: "idea", label: "Idea" },
  { value: "best_practice", label: "Best practice" },
  { value: "research", label: "Research" },
  { value: "presentation", label: "Presentation" },
  { value: "other", label: "Other" },
] as const;

export const KINDS = [
  { value: "note", label: "Note", icon: "📝" },
  { value: "markdown", label: "Markdown", icon: "📘" },
  { value: "pdf", label: "PDF", icon: "📕" },
  { value: "image", label: "Image", icon: "🖼" },
  { value: "google_doc", label: "Google Doc", icon: "📄" },
  { value: "google_sheet", label: "Google Sheet", icon: "📊" },
  { value: "google_slides", label: "Google Slides", icon: "🖼️" },
  { value: "html", label: "HTML page", icon: "🖥️" },
  { value: "link", label: "Link", icon: "🔗" },
] as const;

/**
 * Notes and Markdown documents are the same thing stored the same way: Markdown
 * text in `body`, rendered by the same reader. They are separate kinds only
 * because they arrive differently — a note is typed here, a Markdown document is
 * brought in from a file — and that is worth seeing on a card.
 */
export function isMarkdownKind(value: string) {
  return value === "note" || value === "markdown";
}

/** Largest Markdown document an item may hold. Text, so this is very roomy. */
export const MAX_MARKDOWN_BYTES = 1_000_000;

export function categoryLabel(value: string) {
  return CATEGORIES.find((c) => c.value === value)?.label ?? value;
}

export function kindLabel(value: string) {
  return KINDS.find((k) => k.value === value)?.label ?? value;
}

export function kindIcon(value: string) {
  return KINDS.find((k) => k.value === value)?.icon ?? "📁";
}

/**
 * Largest HTML page an item may hold, in bytes.
 *
 * Kept just under next.config.ts's serverActions.bodySizeLimit (4 MB), which in
 * turn sits under Vercel's 4.5 MB cap on a serverless request body. The form
 * checks against this so an oversized paste is refused with an explanation
 * rather than dying as an unexplained server exception mid-upload.
 */
export const MAX_HTML_BYTES = 3_800_000;

/**
 * Largest image an item may hold.
 *
 * Uploaded images are stored in the database as data: URIs, which is what lets
 * this work with no storage service to set up. Base64 inflates a file by about a
 * third, so the ceiling is set well under MAX_HTML_BYTES to leave room. Photos
 * straight off a phone will exceed it; screenshots and diagrams, the things a
 * library like this actually holds, will not.
 */
export const MAX_IMAGE_BYTES = 2_000_000;

/**
 * Largest PDF an item may hold.
 *
 * The file is sent as part of the form, so it counts against the same 4 MB
 * server action body limit as everything else in next.config.ts — and Vercel
 * caps a serverless request body at 4.5 MB regardless. Unlike an image, a PDF
 * travels as raw bytes rather than base64, so there is no inflation to allow
 * for; the gap left here is for the rest of the form.
 */
export const MAX_PDF_BYTES = 3_500_000;

export function formatBytes(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}
