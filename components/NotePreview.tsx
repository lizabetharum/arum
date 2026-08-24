import { renderNote } from "@/lib/markdown";

/**
 * A rendered note.
 *
 * renderNote escapes its input before formatting it, so what reaches
 * dangerouslySetInnerHTML contains only the tags that function produced — never
 * markup someone typed. See lib/markdown.ts.
 */
export function NotePreview({ markdown }: { markdown: string }) {
  return (
    <div
      className={[
        "prose-note text-sm leading-relaxed text-stone-800",
        // A document's own "#" heading becomes an h2, because the page already
        // shows the title as the h1. The sizes step down from there so a long
        // document has a shape you can skim rather than a wall of bold.
        "[&>*:first-child]:mt-0",
        "[&_h2]:mt-6 [&_h2]:mb-2 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-stone-900",
        "[&_h3]:mt-5 [&_h3]:mb-1.5 [&_h3]:text-base [&_h3]:font-semibold [&_h3]:text-stone-900",
        "[&_h4]:mt-4 [&_h4]:mb-1 [&_h4]:text-xs [&_h4]:font-semibold [&_h4]:uppercase [&_h4]:tracking-wide [&_h4]:text-stone-500",
        "[&_p]:mb-3 [&_ul]:mb-3 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:mb-3 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:mb-1",
        "[&_blockquote]:my-3 [&_blockquote]:border-l-2 [&_blockquote]:border-stone-300 [&_blockquote]:pl-3 [&_blockquote]:text-stone-600",
        "[&_hr]:my-5 [&_hr]:border-stone-200 [&_a]:text-stone-700",
        "[&_pre]:my-3",
      ].join(" ")}
      dangerouslySetInnerHTML={{ __html: renderNote(markdown) }}
    />
  );
}
