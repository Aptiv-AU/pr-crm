import { db } from "@/lib/db";
import { requireOrgId } from "@/lib/server/org";
import {
  getDashboardMetrics,
  parseDate,
} from "@/lib/queries/dashboard-metrics";
import { DashboardFilters } from "@/components/dashboard/filters";
import { PageContainer, PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/dashboard/stat-card";
import { TrendPanel } from "@/components/dashboard/trend-panel";

export const dynamic = "force-dynamic";

interface DashboardSearchParams {
  from?: string;
  to?: string;
  clientId?: string;
}

// Next.js 16: searchParams is a Promise — must be awaited.
// See node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/page.md
export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<DashboardSearchParams>;
}) {
  const sp = await searchParams;
  const filters = {
    from: parseDate(sp.from),
    to: parseDate(sp.to),
    clientId: sp.clientId || undefined,
  };

  const orgId = await requireOrgId();
  const [metrics, clients] = await Promise.all([
    getDashboardMetrics(filters),
    db.client.findMany({
      where: { organizationId: orgId, archivedAt: null },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const rangeLabel =
    filters.from || filters.to
      ? formatRange(filters.from, filters.to)
      : currentMonthLabel();

  const replyRateLabel = replyRate(metrics.sent, metrics.replied);

  const chartData = metrics.byDay.map((d) => ({
    sent: d.sent,
    replied: d.replied,
  }));

  return (
    <PageContainer>
      <PageHeader
        eyebrow="Overview"
        title="Dashboard"
        subtitle="Campaign performance at a glance — what's moving, what's waiting."
        meta={[
          { label: "Updated", value: "Just now" },
          { label: "Period", value: rangeLabel },
          { label: "Clients", value: `${clients.length} active` },
        ]}
        actions={
          <>
            <Button size="sm" variant="default" icon="filter">
              All clients
            </Button>
            <Button size="sm" variant="default">
              {rangeLabel}
            </Button>
          </>
        }
      />

      <DashboardFilters
        clients={clients}
        initial={{ from: sp.from, to: sp.to, clientId: sp.clientId }}
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label="Outreach sent" value={metrics.sent} />
        <StatCard
          label="Replies"
          value={metrics.replied}
          sublabel={replyRateLabel}
        />
        <StatCard label="Coverage" value={metrics.coverages} />
      </div>

      <TrendPanel data={chartData} />
    </PageContainer>
  );
}

function formatRange(from?: Date, to?: Date) {
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  if (from && to) return `${fmt(from)} – ${fmt(to)}`;
  if (from) return `from ${fmt(from)}`;
  if (to) return `until ${fmt(to)}`;
  return "";
}

function currentMonthLabel() {
  return new Date().toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
  });
}

function replyRate(sent: number, replied: number): string | undefined {
  if (sent <= 0) return undefined;
  const pct = Math.round((replied / sent) * 100);
  return `${pct}% reply rate`;
}
