import { db } from "@/lib/db";
import { requireOrgId } from "@/lib/server/org";
import {
  getDashboardMetrics,
  parseDate,
  type DashboardMetrics,
} from "@/lib/queries/dashboard-metrics";
import { DashboardFilters } from "@/components/dashboard/filters";

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

  const rangeLabel = filters.from || filters.to ? formatRange(filters.from, filters.to) : "All time";

  return (
    <div className="px-6 py-8 md:px-10 md:py-10 max-w-[1600px] mx-auto space-y-8">
      {/* Editorial header */}
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div className="flex flex-col gap-2">
          <h2
            className="text-4xl font-extrabold tracking-tight"
            style={{ color: "var(--text-primary)" }}
          >
            Dashboard
          </h2>
          <p className="font-medium italic" style={{ color: "var(--text-sub)" }}>
            Campaign performance at a glance.
          </p>
        </div>
        <span
          className="text-[10px] font-bold uppercase tracking-[0.14em]"
          style={{ color: "var(--text-muted-custom)" }}
        >
          {rangeLabel}
        </span>
      </div>

      <DashboardFilters
        clients={clients}
        initial={{ from: sp.from, to: sp.to, clientId: sp.clientId }}
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <MetricCard label="Outreach sent" value={metrics.sent} />
        <MetricCard
          label="Replies"
          value={metrics.replied}
          hint={replyRate(metrics.sent, metrics.replied)}
        />
        <MetricCard label="Coverage" value={metrics.coverages} />
      </div>

      <TrendChart byDay={metrics.byDay} />
    </div>
  );
}

function formatRange(from?: Date, to?: Date) {
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  if (from && to) return `${fmt(from)} – ${fmt(to)}`;
  if (from) return `from ${fmt(from)}`;
  if (to) return `until ${fmt(to)}`;
  return "";
}

function replyRate(sent: number, replied: number): string | undefined {
  if (sent <= 0) return undefined;
  const pct = Math.round((replied / sent) * 100);
  return `${pct}% reply rate`;
}

function MetricCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: number;
  hint?: string;
}) {
  return (
    <div
      className="rounded-xl p-6"
      style={{
        backgroundColor: "var(--card-bg)",
        boxShadow: "0 1px 2px rgba(15, 23, 42, 0.04)",
      }}
    >
      <div
        className="text-[10px] font-black uppercase tracking-[0.14em]"
        style={{ color: "var(--text-muted-custom)" }}
      >
        {label}
      </div>
      <div
        className="text-[44px] leading-none font-extrabold tracking-tight mt-3"
        style={{ color: "var(--text-primary)" }}
      >
        {value.toLocaleString()}
      </div>
      {hint && (
        <div
          className="text-[12px] italic font-medium mt-2"
          style={{ color: "var(--accent-custom)" }}
        >
          {hint}
        </div>
      )}
    </div>
  );
}

function TrendChart({ byDay }: { byDay: DashboardMetrics["byDay"] }) {
  return (
    <section
      className="rounded-xl p-6 space-y-5"
      style={{
        backgroundColor: "var(--card-bg)",
        boxShadow: "0 1px 2px rgba(15, 23, 42, 0.04)",
      }}
    >
      <div className="flex items-center justify-between">
        <div>
          <div
            className="text-[10px] font-black uppercase tracking-[0.14em]"
            style={{ color: "var(--text-muted-custom)" }}
          >
            Activity over time
          </div>
          <h3
            className="text-xl font-extrabold tracking-tight mt-1"
            style={{ color: "var(--text-primary)" }}
          >
            Outreach &amp; replies
          </h3>
        </div>
        <div className="flex items-center gap-4 text-[11px] font-semibold" style={{ color: "var(--text-sub)" }}>
          <LegendDot color="var(--accent-custom)" label="Sent" />
          <LegendDot color="var(--text-sub)" label="Replied" />
        </div>
      </div>
      {byDay.length === 0 ? (
        <div
          className="py-14 text-center text-[12px] italic font-medium"
          style={{ color: "var(--text-muted-custom)" }}
        >
          No outreach in this range yet.
        </div>
      ) : (
        <SparkLines byDay={byDay} />
      )}
    </section>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        aria-hidden="true"
        style={{
          display: "inline-block",
          width: 8,
          height: 8,
          borderRadius: 999,
          backgroundColor: color,
        }}
      />
      {label}
    </span>
  );
}

function SparkLines({ byDay }: { byDay: DashboardMetrics["byDay"] }) {
  // Fixed viewBox; SVG scales fluidly to container width via width="100%".
  const width = 600;
  const height = 200;
  const padding = { top: 12, right: 8, bottom: 20, left: 28 };
  const innerW = width - padding.left - padding.right;
  const innerH = height - padding.top - padding.bottom;

  const max = Math.max(1, ...byDay.flatMap((d) => [d.sent, d.replied]));
  const n = byDay.length;
  const stepX = n > 1 ? innerW / (n - 1) : 0;

  const x = (i: number) => padding.left + (n > 1 ? i * stepX : innerW / 2);
  const y = (v: number) => padding.top + innerH - (v / max) * innerH;

  const buildPath = (key: "sent" | "replied") =>
    byDay
      .map((d, i) => `${i === 0 ? "M" : "L"} ${x(i).toFixed(2)} ${y(d[key]).toFixed(2)}`)
      .join(" ");

  const sentPath = buildPath("sent");
  const repliedPath = buildPath("replied");

  // Y-axis ticks: 0, mid, max
  const ticks = [0, Math.round(max / 2), max];

  return (
    <svg
      role="img"
      aria-label="Outreach sent and replied per day"
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      style={{ width: "100%", height: 200, display: "block" }}
    >
      {ticks.map((t) => {
        const ty = y(t);
        return (
          <g key={t}>
            <line
              x1={padding.left}
              x2={width - padding.right}
              y1={ty}
              y2={ty}
              stroke="var(--border-custom)"
              strokeDasharray="2 4"
            />
            <text
              x={padding.left - 6}
              y={ty + 3}
              fontSize="10"
              textAnchor="end"
              fill="var(--text-muted-custom)"
            >
              {t}
            </text>
          </g>
        );
      })}
      <path
        d={sentPath}
        fill="none"
        stroke="var(--accent-custom)"
        strokeWidth="2"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <path
        d={repliedPath}
        fill="none"
        stroke="var(--text-sub)"
        strokeWidth="2"
        strokeDasharray="4 3"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {byDay.length <= 14 &&
        byDay.map((d, i) => (
          <text
            key={d.day.toISOString()}
            x={x(i)}
            y={height - 4}
            fontSize="9"
            textAnchor="middle"
            fill="var(--text-muted-custom)"
          >
            {d.day.toISOString().slice(5, 10)}
          </text>
        ))}
    </svg>
  );
}
