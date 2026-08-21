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
