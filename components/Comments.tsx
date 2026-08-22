import { addComment, setThreadStatus, deleteComment } from "@/lib/comment-actions";
import { groupThreads, type CommentRow } from "@/lib/comments";

function when(d: Date) {
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function Comments({
  itemId,
  rows,
  viewerId,
  viewerIsAdmin,
}: {
  itemId: string;
  rows: CommentRow[];
  viewerId: string;
  viewerIsAdmin: boolean;
}) {
  const threads = groupThreads(rows);
  const open = threads.filter((t) => t.status !== "resolved").length;

  return (
    <section className="mt-8">
      <div className="flex flex-wrap items-baseline justify-between gap-2 mb-3">
        <h2 className="font-semibold">
          Comments{" "}
          <span className="text-sm font-normal text-stone-500">
            {threads.length === 0
              ? "— none yet"
              : `— ${open} open of ${threads.length}`}
          </span>
        </h2>
        {threads.length > 0 && (
          <a
            href={`/items/${itemId}/comments.csv`}
            className="text-sm text-stone-600 hover:text-stone-900 underline"
          >
            Download as spreadsheet
          </a>
        )}
      </div>

      <div className="space-y-3">
        {threads.map((t) => {
          const resolved = t.status === "resolved";
          return (
            <div
              key={t.thread}
              id={`thread-${t.thread}`}
              className={`scroll-mt-4 rounded-xl border p-4 ${
                resolved ? "border-stone-200 bg-stone-50 opacity-70" : "border-stone-200 bg-white"
              }`}
            >
              <div className="flex flex-wrap items-baseline gap-2 mb-2">
                <span className="rounded-full bg-stone-800 text-white text-xs px-2 py-0.5">
                  {t.thread}
                </span>
                {t.section && <span className="text-xs text-stone-500">{t.section}</span>}
                {resolved && <span className="text-xs text-stone-500">resolved</span>}
                <form action={setThreadStatus} className="ml-auto">
                  <input type="hidden" name="itemId" value={itemId} />
                  <input type="hidden" name="thread" value={t.thread} />
                  <input type="hidden" name="status" value={resolved ? "open" : "resolved"} />
                  <button className="text-xs text-stone-500 hover:text-stone-800">
                    {resolved ? "Reopen" : "Resolve"}
                  </button>
                </form>
              </div>

              {t.quotedText && (
                <blockquote className="mb-2 border-l-2 border-amber-400 pl-3 text-sm text-stone-600 italic">
                  {t.quotedText}
                </blockquote>
              )}

              <div className="space-y-2">
                {t.notes.map((n) => (
                  <div key={n.id} className="text-sm">
                    <div className="flex items-baseline gap-2">
                      <span className="font-medium">{n.author}</span>
                      <span className="text-xs text-stone-400">{when(n.createdAt)}</span>
                      {(n.authorId === viewerId || viewerIsAdmin) && (
                        <form action={deleteComment} className="ml-auto">
                          <input type="hidden" name="commentId" value={n.id} />
                          <button className="text-xs text-stone-400 hover:text-red-600">
                            Delete
                          </button>
                        </form>
                      )}
                    </div>
                    <p className="whitespace-pre-wrap text-stone-700">{n.body}</p>
                  </div>
                ))}
              </div>

              {!resolved && (
                <form action={addComment} className="mt-3 flex gap-2">
                  <input type="hidden" name="itemId" value={itemId} />
                  <input type="hidden" name="thread" value={t.thread} />
                  <input
                    name="body"
                    required
                    placeholder="Reply…"
                    className="flex-1 rounded-lg border border-stone-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-stone-400"
                  />
                  <button className="rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-sm hover:border-stone-500">
                    Reply
                  </button>
                </form>
              )}
            </div>
          );
        })}
      </div>

      <form action={addComment} className="mt-3 rounded-xl border border-stone-200 bg-white p-4">
        <input type="hidden" name="itemId" value={itemId} />
        <input type="hidden" name="thread" value="0" />
        <label className="block text-sm">
          <span className="block text-xs text-stone-500 mb-1">Add a comment</span>
          <textarea
            name="body"
            required
            rows={2}
            placeholder="What did you notice?"
            className="w-full rounded-lg border border-stone-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-stone-400"
          />
        </label>
        <button className="mt-2 rounded-lg bg-stone-800 text-white px-4 py-1.5 text-sm hover:bg-stone-700">
          Comment
        </button>
      </form>
    </section>
  );
}
