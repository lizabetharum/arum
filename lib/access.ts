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

const itemListInclude = {
  project: { select: { slug: true, name: true } },
  tags: { include: { tag: true } },
} satisfies Prisma.ItemInclude;

export type ItemWithMeta = Prisma.ItemGetPayload<{ include: typeof itemListInclude }>;

/** One item, only if this user may see it. */
export async function getAccessibleItem(user: SessionUser, id: string) {
  return prisma.item.findFirst({
    where: { AND: [{ id }, itemAccessWhere(user)] },
    include: itemListInclude,
  });
}

/** Search this user's accessible items by title, description, and tag. */
export async function searchItems(user: SessionUser, query: string): Promise<ItemWithMeta[]> {
  const q = query.trim();
  if (!q) return [];
  return prisma.item.findMany({
    where: {
      AND: [
        itemAccessWhere(user),
        {
          OR: [
            { title: { contains: q, mode: "insensitive" } },
            { description: { contains: q, mode: "insensitive" } },
            { tags: { some: { tag: { name: { contains: q, mode: "insensitive" } } } } },
          ],
        },
      ],
    },
    include: itemListInclude,
    orderBy: { updatedAt: "desc" },
    take: 50,
  });
}

/** Items of one project this user may see, optionally filtered. */
export async function getProjectItems(
  user: SessionUser,
  projectId: string,
  filters: { category?: string; tag?: string },
): Promise<ItemWithMeta[]> {
  return prisma.item.findMany({
    where: {
      AND: [
        { projectId },
        itemAccessWhere(user),
        ...(filters.category ? [{ category: filters.category }] : []),
        ...(filters.tag ? [{ tags: { some: { tag: { name: filters.tag } } } }] : []),
      ],
    },
    include: itemListInclude,
    orderBy: { updatedAt: "desc" },
  });
}
