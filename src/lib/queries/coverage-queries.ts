import { db } from "@/lib/db";

interface CoverageFilters {
  campaignId?: string;
  type?: string;
  dateFrom?: string;
  dateTo?: string;
}

export async function getCoverages(organizationId: string, filters?: CoverageFilters) {
  const coverages = await db.coverage.findMany({
    where: {
      organizationId,
      ...(filters?.campaignId ? { campaignId: filters.campaignId } : {}),
      ...(filters?.type && filters.type !== "All" ? { type: filters.type } : {}),
      ...(filters?.dateFrom || filters?.dateTo
        ? {
            date: {
              ...(filters?.dateFrom ? { gte: new Date(filters.dateFrom) } : {}),
              ...(filters?.dateTo ? { lte: new Date(filters.dateTo) } : {}),
            },
          }
        : {}),
    },
    include: {
      campaign: {
        select: {
          id: true,
          name: true,
          client: {
            select: {
              id: true,
              name: true,
              initials: true,
              colour: true,
              bgColour: true,
            },
          },
        },
      },
      contact: {
        select: {
          id: true,
          name: true,
        },
      },
    },
    orderBy: { date: "desc" },
  });

  return coverages;
}

export async function getCoverageStats(organizationId: string) {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [total, thisMonthCount, allCoverages] = await Promise.all([
    db.coverage.count({ where: { organizationId } }),
    db.coverage.count({
      where: {
        organizationId,
        date: { gte: startOfMonth },
      },
    }),
    db.coverage.findMany({
      where: { organizationId },
      select: {
        mediaValue: true,
        publication: true,
      },
    }),
  ]);

  // Calculate total media value
  const totalMediaValue = allCoverages.reduce((sum, c) => {
    return sum + (c.mediaValue ? Number(c.mediaValue) : 0);
  }, 0);

  // Find top publication
  const pubCounts: Record<string, number> = {};
  for (const c of allCoverages) {
    pubCounts[c.publication] = (pubCounts[c.publication] || 0) + 1;
  }
  const topPublication =
    Object.entries(pubCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

  return { total, totalMediaValue, thisMonthCount, topPublication };
}

export async function getCoverageByCampaign(campaignId: string) {
  const coverages = await db.coverage.findMany({
    where: { campaignId },
    include: {
      contact: {
        select: {
          id: true,
          name: true,
        },
      },
    },
    orderBy: { date: "desc" },
  });

  return coverages;
}
