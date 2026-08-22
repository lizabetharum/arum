/**
 * A small Markdown renderer for notes.
 *
 * Deliberately not a library: the input is escaped before any formatting is
 * applied, so no markup a writer types can become markup in the page. That
 * makes the output safe by construction rather than by a sanitiser that has to
 * be kept correct, and it means one fewer dependency to track for a feature
 * whose whole job is "let me type something down".
 *
 * It covers what people actually use in notes. Anything outside that set is
 * shown as the characters that were typed, which is the honest failure: you can
 * see your text, it just isn't styled.
 */

const escapeHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** Inline formatting, applied to already-escaped text. */
function inline(text: string): string {
  return (
    text
      // `code` first: nothing inside it should be formatted further.
      .replace(/`([^`]+)`/g, '<code class="rounded bg-stone-100 px-1 py-0.5 text-[0.9em]">$1</code>')
      .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
      .replace(/(^|[^*])\*([^*]+)\*/g, "$1<em>$2</em>")
      // Only http(s) links become links — a javascript: or data: URL never does.
      .replace(
        /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,
        '<a href="$2" target="_blank" rel="noopener noreferrer" class="underline hover:text-stone-900">$1</a>',
      )
      .replace(
        /(^|\s)(https?:\/\/[^\s<]+)/g,
        '$1<a href="$2" target="_blank" rel="noopener noreferrer" class="underline hover:text-stone-900">$2</a>',
      )
  );
}

export function renderNote(markdown: string): string {
  const lines = escapeHtml(markdown).split(/\r?\n/);
  const out: string[] = [];
  let list: "ul" | "ol" | null = null;
  let inCode = false;
  let para: string[] = [];

  const closeList = () => {
    if (list) {
      out.push(`</${list}>`);
      list = null;
    }
  };
  const closePara = () => {
    if (para.length) {
      out.push(`<p>${inline(para.join(" "))}</p>`);
      para = [];
    }
  };

  for (const line of lines) {
    if (/^```/.test(line.trim())) {
      closePara();
      closeList();
      out.push(inCode ? "</code></pre>" : '<pre class="overflow-x-auto rounded-lg bg-stone-100 p-3 text-xs"><code>');
      inCode = !inCode;
      continue;
    }
    if (inCode) {
      out.push(line);
      continue;
    }

    const heading = line.match(/^(#{1,4})\s+(.*)$/);
    if (heading) {
      closePara();
      closeList();
      const level = heading[1].length + 1; // a note's own title is the h1
      out.push(`<h${level}>${inline(heading[2])}</h${level}>`);
      continue;
    }

    const bullet = line.match(/^\s*[-*]\s+(.*)$/);
    const numbered = line.match(/^\s*\d+[.)]\s+(.*)$/);
    if (bullet || numbered) {
      closePara();
      const want = bullet ? "ul" : "ol";
      if (list !== want) {
        closeList();
        out.push(`<${want}>`);
        list = want;
      }
      out.push(`<li>${inline((bullet ?? numbered)![1])}</li>`);
      continue;
    }

    // Matches &gt; rather than >, because escaping happens before this runs.
    const quote = line.match(/^&gt;\s?(.*)$/);
    if (quote) {
      closePara();
      closeList();
      out.push(`<blockquote>${inline(quote[1])}</blockquote>`);
      continue;
    }

    if (/^\s*([-*_])\1{2,}\s*$/.test(line)) {
      closePara();
      closeList();
      out.push("<hr />");
      continue;
    }

    if (line.trim() === "") {
      closePara();
      closeList();
      continue;
    }
    para.push(line.trim());
  }

  closePara();
  closeList();
  if (inCode) out.push("</code></pre>");
  return out.join("\n");
}
