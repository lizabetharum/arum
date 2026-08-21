export const SITE_NAME = "Artifact Library";

export const CATEGORIES = [
  { value: "debrief", label: "Debrief" },
  { value: "idea", label: "Idea" },
  { value: "best_practice", label: "Best practice" },
  { value: "research", label: "Research" },
  { value: "presentation", label: "Presentation" },
  { value: "other", label: "Other" },
] as const;

export const KINDS = [
  { value: "google_doc", label: "Google Doc", icon: "📄" },
  { value: "google_sheet", label: "Google Sheet", icon: "📊" },
  { value: "google_slides", label: "Google Slides", icon: "🖼️" },
  { value: "html", label: "HTML page", icon: "🖥️" },
  { value: "link", label: "Link", icon: "🔗" },
] as const;

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

export function formatBytes(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}
