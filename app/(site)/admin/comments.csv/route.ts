// Every comment the viewer is allowed to see, across all projects, as one sheet.
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { itemAccessWhere } from "@/lib/access";
import { toCsv } from "@/lib/comments";
import type { SessionUser } from "@/lib/auth";

function load(user: SessionUser) {
  return prisma.comment.findMany({
    where: { item: itemAccessWhere(user) },
    include: {
      user: { select: { id: true, name: true } },
      item: { select: { title: true, project: { select: { name: true } } } },
    },
    orderBy: [{ createdAt: "asc" }],
  });
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return new Response("Sign in first.", { status: 401 });

  // Same tolerance as the item page: a database that predates commenting
  // exports an empty sheet rather than erroring.
  let rows: Awaited<ReturnType<typeof load>> = [];
  try {
    rows = await load(user);
  } catch {
    rows = [];
  }

  const csv = toCsv(
    rows.map((c) => ({
      id: c.id,
      thread: c.thread,
      body: c.body,
      status: c.status,
      section: c.section,
      quotedText: c.quotedText,
      prefix: c.prefix,
      suffix: c.suffix,
      createdAt: c.createdAt,
      author: c.user.name,
      authorId: c.user.id,
      itemTitle: c.item.title,
      projectName: c.item.project.name,
    })),
  );
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="all-comments.csv"',
      "Cache-Control": "private, no-store",
    },
  });
}
