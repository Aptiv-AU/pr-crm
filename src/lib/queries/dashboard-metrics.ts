import { db } from "@/lib/db";
import { requireOrgId } from "@/lib/server/org";
import { OutreachStatus, Prisma } from "@prisma/client";

export { parseDate } from "./parse-date";

export type DashboardFilters = { from?: Date; to?: Date; clientId?: string };

export type DashboardMetrics = {
  sent: number;
  replied: number;
  coverages: number;
  byDay: Array<{ day: Date; sent: number; replied: number }>;
};

/**
 * Aggregate metrics for the dashboard. All filters are server-side and
 * scoped to the current org. Date range is inclusive.
 *
 * SQL injection note: every value passes through `${...}` inside the
 * `Prisma.sql` tagged template, which parameterizes the query. Do not
 * switch to string concatenation. `Prisma.empty` is the no-op fragment.
 */
export async function getDashboardMetrics(
  filters: DashboardFilters
): Promise<DashboardMetrics> {
  const orgId = await requireOrgId();
  const { from, to, clientId } = filters;

  const campaignFilter: Prisma.CampaignWhereInput = {
    organizationId: orgId,
    ...(clientId ? { clientId } : {}),
  };
  const sentAtRange =
    from || to
      ? { sentAt: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } }
      : {};
  const outreachWhere: Prisma.OutreachWhereInput = {
    campaign: campaignFilter,
    ...sentAtRange,
  };

  const coverageDateRange =
    from || to
      ? { date: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } }
      : {};

  const [sent, replied, coverages, byDay] = await Promise.all([
    db.outreach.count({ where: { ...outreachWhere, status: OutreachStatus.sent } }),
    db.outreach.count({ where: { ...outreachWhere, status: OutreachStatus.replied } }),
    db.coverage.count({
      where: {
        organizationId: orgId,
        ...(clientId ? { campaign: { clientId } } : {}),
        ...coverageDateRange,
      },
    }),
    db.$queryRaw<Array<{ day: Date; sent_count: bigint; replied_count: bigint }>>(
      Prisma.sql`
        SELECT date_trunc('day', o."sentAt") AS day,
               COUNT(*) FILTER (WHERE o.status = 'sent'::"OutreachStatus")    AS sent_count,
               COUNT(*) FILTER (WHERE o.status = 'replied'::"OutreachStatus") AS replied_count
        FROM "Outreach" o
        JOIN "Campaign" c ON c.id = o."campaignId"
        WHERE c."organizationId" = ${orgId}
          ${clientId ? Prisma.sql`AND c."clientId" = ${clientId}` : Prisma.empty}
          ${from ? Prisma.sql`AND o."sentAt" >= ${from}` : Prisma.empty}
          ${to ? Prisma.sql`AND o."sentAt" <= ${to}` : Prisma.empty}
          AND o."sentAt" IS NOT NULL
        GROUP BY day
        ORDER BY day ASC
      `
    ),
  ]);

  return {
    sent,
    replied,
    coverages,
    byDay: byDay.map((r) => ({
      day: r.day,
      sent: Number(r.sent_count),
      replied: Number(r.replied_count),
    })),
  };
}

