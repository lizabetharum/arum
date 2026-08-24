import "server-only";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import type { SessionUser } from "@/lib/auth";

/**
 * The one access rule, as a Prisma filter. Everything a non-admin is shown goes
 * through this: the item's project must include them as a member, and a
 * restricted item must additionally grant them by name.
 */
export function itemAccessWhere(user: SessionUser): Prisma.ItemWhereInput {
  if (user.role === "admin") return {};
  return {
    project: { members: { some: { userId: user.id } } },
    OR: [{ restricted: false }, { grants: { some: { userId: user.id } } }],
  };
}

export function projectAccessWhere(user: SessionUser): Prisma.ProjectWhereInput {
  if (user.role === "admin") return {};
  return { members: { some: { userId: user.id } } };
}


/**
 * Sections and hand-set order live in columns added by sql/06. Code reaches
 * production before a migration is run against the database, so every query
 * that wants them has to cope with them not being there yet -- otherwise a
 * deploy takes the site down until someone opens the SQL editor.
 *
 * The full query is tried first. A missing column is remembered for a minute so
 * the failure is paid once rather than on every request, and re-checked after
 * that so the site picks the columns up on its own once the migration is run,
 * with no redeploy needed.
 */
let sectionsMissingUntil = 0;

function isMissingColumn(e: unknown) {
  return e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2022";
}

/** Items as the rest of the app expects them, whether or not sql/06 has run. */
async function withSectionFallback<T extends { id: string }>(
  run: (sorted: boolean) => Promise<T[]>,
): Promise<(T & { section: string; position: number })[]> {
  if (Date.now() >= sectionsMissingUntil) {
    try {
      return (await run(true)) as (T & { section: string; position: number })[];
    } catch (e) {
      if (!isMissingColumn(e)) throw e;
      sectionsMissingUntil = Date.now() + 60_000;
    }
  }
  // No sections yet: one unnamed group, in the order the old site used.
  const rows = await run(false);
  return rows.map((r) => ({ ...r, section: "", position: 0 }));
}

/** Sorting that puts a project in the order its owner chose. */
const BY_HAND: Prisma.ItemOrderByWithRelationInput[] = [{ position: "asc" }, { createdAt: "asc" }];
const BY_RECENT: Prisma.ItemOrderByWithRelationInput[] = [{ updatedAt: "desc" }];

/** The columns to read when sql/06 has not been run: everything except those two. */
const legacySelect = {
  id: true,
  projectId: true,
  title: true,
  description: true,
  kind: true,
  url: true,
  htmlContent: true,
  body: true,
  category: true,
  restricted: true,
  createdAt: true,
  updatedAt: true,
  project: { select: { slug: true, name: true } },
  tags: { include: { tag: true } },
} satisfies Prisma.ItemSelect;

const itemListInclude = {
  project: { select: { slug: true, name: true } },
  tags: { include: { tag: true } },
} satisfies Prisma.ItemInclude;

export type ItemWithMeta = Prisma.ItemGetPayload<{ include: typeof itemListInclude }>;

/** One item, only if this user may see it. */
export async function getAccessibleItem(user: SessionUser, id: string) {
  const where = { AND: [{ id }, itemAccessWhere(user)] };
  const [item] = await withSectionFallback((sorted) =>
    sorted
      ? prisma.item.findMany({ where, include: itemListInclude, take: 1 })
      : prisma.item.findMany({ where, select: legacySelect, take: 1 }),
  );
  return (item ?? null) as ItemWithMeta | null;
}

/** Search this user's accessible items by title, description, and tag. */
export async function searchItems(user: SessionUser, query: string): Promise<ItemWithMeta[]> {
  const q = query.trim();
  if (!q) return [];
  const where: Prisma.ItemWhereInput = {
    AND: [
      itemAccessWhere(user),
      {
        OR: [
          { title: { contains: q, mode: "insensitive" } },
          { description: { contains: q, mode: "insensitive" } },
          // A note's text is its content, so searching it is the whole point.
          { body: { contains: q, mode: "insensitive" } },
          { tags: { some: { tag: { name: { contains: q, mode: "insensitive" } } } } },
        ],
      },
    ],
  };
  return withSectionFallback((sorted) =>
    sorted
      ? prisma.item.findMany({ where, include: itemListInclude, orderBy: BY_RECENT, take: 50 })
      : prisma.item.findMany({ where, select: legacySelect, orderBy: BY_RECENT, take: 50 }),
  ) as Promise<ItemWithMeta[]>;
}

/** Items of one project this user may see, optionally filtered. */
export async function getProjectItems(
  user: SessionUser,
  projectId: string,
  filters: { category?: string; tag?: string },
): Promise<ItemWithMeta[]> {
  const where: Prisma.ItemWhereInput = {
    AND: [
      { projectId },
      itemAccessWhere(user),
      ...(filters.category ? [{ category: filters.category }] : []),
      ...(filters.tag ? [{ tags: { some: { tag: { name: filters.tag } } } }] : []),
    ],
  };
  return withSectionFallback((sorted) =>
    sorted
      ? prisma.item.findMany({ where, include: itemListInclude, orderBy: BY_HAND })
      : prisma.item.findMany({ where, select: legacySelect, orderBy: BY_RECENT }),
  ) as Promise<ItemWithMeta[]>;
}

/** A project's items gathered under their section headings, in order. */
export type Section = { name: string; items: ItemWithMeta[] };

export function groupIntoSections(items: ItemWithMeta[]): Section[] {
  const sections = new Map<string, ItemWithMeta[]>();
  for (const item of items) {
    const name = (item.section ?? "").trim();
    const existing = sections.get(name);
    if (existing) existing.push(item);
    else sections.set(name, [item]);
  }
  // Insertion order is the order the items came back in, so the sections follow
  // the same hand-set order as the items rather than needing an order of their
  // own. The unnamed group is pulled to the top: those are the loose items, and
  // burying them under the named sections is how things get lost.
  const named = [...sections].map(([name, items]) => ({ name, items }));
  return [...named.filter((s) => !s.name), ...named.filter((s) => s.name)];
}

/**
 * Every item in a project, for the admin screen that arranges them: grouped and
 * hand-ordered where sql/06 has been run, and a plain recent-first list where it
 * has not. Carries the grant count so the list can show what is restricted.
 */
export type AdminItem = {
  id: string;
  title: string;
  kind: string;
  category: string;
  restricted: boolean;
  section: string;
  position: number;
  grants: { id: string }[];
};

export async function getProjectItemsForAdmin(projectId: string): Promise<AdminItem[]> {
  const base = {
    id: true,
    title: true,
    kind: true,
    category: true,
    restricted: true,
    grants: { select: { id: true } },
  } satisfies Prisma.ItemSelect;

  return withSectionFallback((sorted) =>
    sorted
      ? prisma.item.findMany({
          where: { projectId },
          select: { ...base, section: true, position: true },
          orderBy: BY_HAND,
        })
      : prisma.item.findMany({ where: { projectId }, select: base, orderBy: BY_RECENT }),
  ) as Promise<AdminItem[]>;
}

/** Section names already used in a project, for the picker on the item form. */
export async function getProjectSections(projectId: string): Promise<string[]> {
  try {
    const rows = await prisma.item.findMany({
      where: { projectId, NOT: { section: "" } },
      distinct: ["section"],
      orderBy: [{ position: "asc" }],
      select: { section: true },
    });
    return rows.map((r) => r.section);
  } catch (e) {
    if (!isMissingColumn(e)) throw e;
    return [];
  }
}

/** False until sql/06 has been run, so the form can hide a box that cannot save. */
export async function sectionsAvailable(): Promise<boolean> {
  const rows = await prisma.$queryRaw<{ n: bigint }[]>`
    SELECT count(*) AS n FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'Item' AND column_name = 'section'`;
  return Number(rows[0]?.n ?? 0) > 0;
}

/** One item with everything the edit form needs, before or after sql/06. */
export async function getItemForEdit(id: string) {
  const relations = {
    project: {
      include: {
        members: {
          include: { user: { select: { id: true, name: true, email: true, role: true } } },
          orderBy: { user: { name: "asc" as const } },
        },
      },
    },
    tags: { include: { tag: true } },
    grants: true,
  };
  const scalars = {
    id: true,
    title: true,
    description: true,
    kind: true,
    url: true,
    htmlContent: true,
    body: true,
    category: true,
    restricted: true,
  } satisfies Prisma.ItemSelect;

  try {
    return await prisma.item.findUnique({
      where: { id },
      select: { ...scalars, section: true, ...relations },
    });
  } catch (e) {
    if (!isMissingColumn(e)) throw e;
    const row = await prisma.item.findUnique({ where: { id }, select: { ...scalars, ...relations } });
    return row && { ...row, section: "" };
  }
}
