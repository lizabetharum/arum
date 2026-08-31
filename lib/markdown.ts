/**
 * A small Markdown renderer for notes.
 *
 * Deliberately not a library: the input is escaped before any formatting is
 * applied, so no markup a writer types can become markup in the page. That
 * makes the output safe by construction rather than by a sanitiser that has to
 * be kept correct, and it means one fewer dependency to track for a feature
 * whose whole job is "let me type something down".
 *
 * It covers what people actually use in notes: headings, bold and italic,
 * bulleted and numbered lists, blockquotes, horizontal rules, code spans and
 * fences, links, and pipe tables. Anything outside that set is shown as the
 * characters that were typed, which is the honest failure: you can see your
 * text, it just isn't styled.
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

/**
 * Split one table row into cells.
 *
 * Outer pipes are optional, as they are in every Markdown dialect people
 * actually type, and a backslash-escaped pipe is a pipe rather than a cell
 * boundary — which is how a cell holds a value like `a \| b`.
 */
function tableCells(row: string): string[] {
  const trimmed = row.trim().replace(/^\|/, "").replace(/\|$/, "");
  const out: string[] = [];
  let cell = "";
  for (let i = 0; i < trimmed.length; i++) {
    if (trimmed[i] === "\\" && trimmed[i + 1] === "|") {
      cell += "|";
      i++;
    } else if (trimmed[i] === "|") {
      out.push(cell.trim());
      cell = "";
    } else {
      cell += trimmed[i];
    }
  }
  out.push(cell.trim());
  return out;
}

/**
 * The `|---|:--:|---:|` line under a table's header. It is what tells a row of
 * pipes apart from a sentence that happens to contain one, so a paragraph is
 * never mistaken for a table.
 */
function isTableDivider(line: string) {
  return line.includes("|") && line.includes("-") && /^[\s|:-]+$/.test(line);
}

function alignmentOf(cell: string) {
  const left = cell.startsWith(":");
  const right = cell.endsWith(":");
  if (left && right) return "center";
  return right ? "right" : "left";
}

const TABLE_WRAP = '<div class="my-4 overflow-x-auto">';
const TABLE = '<table class="w-full border-collapse text-left text-sm">';
const TH = "border-b-2 border-stone-300 px-3 py-2 font-semibold text-stone-700 align-bottom";
const TD = "border-b border-stone-100 px-3 py-2 align-top";

function renderTable(header: string[], aligns: string[], rows: string[][]): string {
  const align = (i: number) => `text-${aligns[i] ?? "left"}`;
  const head = header
    .map((c, i) => `<th class="${TH} ${align(i)}">${inline(c)}</th>`)
    .join("");
  const body = rows
    .map((row) => {
      // Short rows are padded and long ones trimmed, so a table with one
      // ragged line still lines up instead of collapsing.
      const cells = header.map((_, i) => row[i] ?? "");
      return `<tr>${cells.map((c, i) => `<td class="${TD} ${align(i)}">${inline(c)}</td>`).join("")}</tr>`;
    })
    .join("");
  return `${TABLE_WRAP}${TABLE}<thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></div>`;
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

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
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

    // A table: this line has pipes and the next is the divider.
    if (line.includes("|") && i + 1 < lines.length && isTableDivider(lines[i + 1])) {
      closePara();
      closeList();
      const header = tableCells(line);
      const aligns = tableCells(lines[i + 1]).map(alignmentOf);
      i++;
      const rows: string[][] = [];
      while (i + 1 < lines.length && lines[i + 1].includes("|") && lines[i + 1].trim() !== "") {
        rows.push(tableCells(lines[i + 1]));
        i++;
      }
      out.push(renderTable(header, aligns, rows));
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
