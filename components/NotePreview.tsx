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
      className="prose-note text-sm leading-relaxed text-stone-800 [&_h2]:mb-1 [&_h2]:mt-3 [&_h2]:text-base [&_h2]:font-semibold [&_h3]:mb-1 [&_h3]:mt-3 [&_h3]:font-semibold [&_p]:mb-2 [&_ul]:mb-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:mb-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:mb-0.5 [&_blockquote]:my-2 [&_blockquote]:border-l-2 [&_blockquote]:border-stone-300 [&_blockquote]:pl-3 [&_blockquote]:text-stone-600 [&_hr]:my-3 [&_hr]:border-stone-200 [&_a]:text-stone-700"
      dangerouslySetInnerHTML={{ __html: renderNote(markdown) }}
    />
  );
}
