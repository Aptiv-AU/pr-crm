"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SlideOverPanel } from "@/components/shared/slide-over-panel";
import { CoverageForm } from "./coverage-form";
import { CoverageRow } from "./coverage-card";
import { PageContainer, PageHeader } from "@/components/layout/page-header";

interface CoverageListClientProps {
  coverages: {
    id: string;
    slug: string;
    publication: string;
    date: string;
    type: string;
    url: string | null;
    mediaValue: number | null;
    attachmentUrl: string | null;
    notes: string | null;
    campaignId: string | null;
    contactId: string | null;
    campaign: {
      id: string;
      name: string;
      client: {
        id: string;
        name: string;
        initials: string;
        colour: string;
        bgColour: string;
      };
    } | null;
    contact: { id: string; name: string } | null;
  }[];
  stats: {
    total: number;
    totalMediaValue: number;
    thisMonthCount: number;
    topPublication: string | null;
  };
  campaigns: { id: string; name: string }[];
  contacts: { id: string; name: string }[];
}

function formatMediaValue(value: number): string {
  if (value >= 1_000_000) return "$" + (value / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
  if (value >= 1_000) return "$" + (value / 1_000).toFixed(1).replace(/\.0$/, "") + "k";
  return "$" + value.toLocaleString("en-US");
}

function formatDateRange(dates: Date[]): string | null {
  if (dates.length === 0) return null;
  const sorted = [...dates].sort((a, b) => a.getTime() - b.getTime());
  const first = sorted[0];
  const last = sorted[sorted.length - 1];
  const fmt = (d: Date) =>
    d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const year = last.getFullYear();
  if (first.getTime() === last.getTime()) return `${fmt(first)}, ${year}`;
  return `${fmt(first)} — ${fmt(last)}, ${year}`;
}

function MicroLabel({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontSize: 10,
        fontWeight: 800,
        textTransform: "uppercase",
        letterSpacing: "0.12em",
        color: "var(--text-muted-custom)",
      }}
    >
      {children}
    </div>
  );
}

interface StatItem {
  label: string;
  value: string;
  sub?: string;
}

function StatRow({ items }: { items: StatItem[] }) {
  if (items.length === 0) return null;
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${items.length}, 1fr)`,
        gap: 16,
      }}
    >
      {items.map((it, i) => (
        <Card key={i} style={{ padding: "18px 20px" }}>
          <MicroLabel>{it.label}</MicroLabel>
          <div
            style={{
              fontSize: 32,
              fontWeight: 800,
              letterSpacing: "-0.02em",
              marginTop: 10,
              lineHeight: 1.05,
              color: "var(--text-primary)",
            }}
          >
            {it.value}
          </div>
          {it.sub && (
            <div
              style={{
                fontSize: 12,
                color: "var(--text-sub)",
                marginTop: 4,
                fontWeight: 500,
              }}
            >
              {it.sub}
            </div>
          )}
        </Card>
      ))}
    </div>
  );
}

export function CoverageListClient({
  coverages,
  stats,
  campaigns,
  contacts,
}: CoverageListClientProps) {
  const [addOpen, setAddOpen] = useState(false);
  const router = useRouter();

  function handleSuccess() {
    setAddOpen(false);
    router.refresh();
  }

  const { thisQuarterCount, dateRange } = useMemo(() => {
    const now = new Date();
    const quarter = Math.floor(now.getMonth() / 3);
    const quarterStart = new Date(now.getFullYear(), quarter * 3, 1);
    const dates = coverages.map((c) => new Date(c.date));
    const qCount = dates.filter((d) => d >= quarterStart).length;
    return { thisQuarterCount: qCount, dateRange: formatDateRange(dates) };
  }, [coverages]);

  const statItems: StatItem[] = [
    {
      label: "Placements",
      value: String(stats.total),
      sub: thisQuarterCount > 0 ? `${thisQuarterCount} this quarter` : undefined,
    },
  ];
  if (stats.totalMediaValue > 0) {
    statItems.push({ label: "Media value", value: formatMediaValue(stats.totalMediaValue) });
  }
  if (stats.thisMonthCount > 0) {
    statItems.push({ label: "This month", value: String(stats.thisMonthCount) });
  }
  if (stats.topPublication) {
    statItems.push({ label: "Top outlet", value: stats.topPublication });
  }

  const metaItems = [
    { label: "Placements", value: String(stats.total) },
  ];
  if (stats.totalMediaValue > 0) {
    metaItems.push({ label: "Media value", value: formatMediaValue(stats.totalMediaValue) });
  }
  if (stats.thisMonthCount > 0) {
    metaItems.push({ label: "This month", value: String(stats.thisMonthCount) });
  }

  return (
    <PageContainer>
      <PageHeader
        eyebrow="Directory"
        title="Coverage"
        subtitle="Everything placed, in order of pickup."
        meta={metaItems}
        actions={
          <Button variant="primary" size="sm" icon="plus" onClick={() => setAddOpen(true)}>
            Log coverage
          </Button>
        }
      />

      <StatRow items={statItems} />

      <Card style={{ padding: 0 }}>
        <div
          style={{
            padding: "16px 20px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderBottom: "1px solid var(--border-custom)",
          }}
        >
          <MicroLabel>Recent placements</MicroLabel>
          {dateRange && (
            <span
              style={{
                fontSize: 11,
                color: "var(--text-muted-custom)",
                fontWeight: 600,
                fontFamily: "var(--font-mono)",
              }}
            >
              {dateRange}
            </span>
          )}
        </div>

        {coverages.length === 0 ? (
          <div
            style={{
              padding: "32px 20px",
              fontSize: 13,
              color: "var(--text-muted-custom)",
              textAlign: "center",
              fontStyle: "italic",
            }}
          >
            No placements logged yet.
          </div>
        ) : (
          coverages.map((c, i) => (
            <CoverageRow key={c.id} coverage={c} isFirst={i === 0} />
          ))
        )}
      </Card>

      <SlideOverPanel open={addOpen} onClose={() => setAddOpen(false)} title="Add Coverage">
        {addOpen && (
          <CoverageForm campaigns={campaigns} contacts={contacts} onSuccess={handleSuccess} />
        )}
      </SlideOverPanel>
    </PageContainer>
  );
}
