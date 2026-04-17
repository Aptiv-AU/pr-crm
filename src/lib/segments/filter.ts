import type { Prisma } from "@prisma/client";

export type SegmentFilter = {
  tagIds?: string[];
  outlets?: string[];
  beats?: string[];
  tiers?: string[];
  search?: string;
};

export function buildSegmentWhere(
  organizationId: string,
  filter: SegmentFilter,
): Prisma.ContactWhereInput {
  const where: Prisma.ContactWhereInput = { organizationId };
  if (filter.outlets?.length) where.outlet = { in: filter.outlets };
  if (filter.beats?.length) where.beat = { in: filter.beats };
  if (filter.tiers?.length) where.tier = { in: filter.tiers };
  if (filter.search?.trim()) {
    const q = filter.search.trim();
    where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { email: { contains: q, mode: "insensitive" } },
      { outlet: { contains: q, mode: "insensitive" } },
    ];
  }
  if (filter.tagIds?.length) {
    where.AND = filter.tagIds.map((tagId) => ({
      tags: { some: { tagId } },
    }));
  }
  return where;
}
