"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { StatsBar } from "@/components/shared/stats-bar";
import { FilterPills } from "@/components/shared/filter-pills";
import { SlideOverPanel } from "@/components/shared/slide-over-panel";
import { CoverageForm } from "./coverage-form";
import { CoverageCard } from "./coverage-card";
import { EmptyState } from "@/components/shared/empty-state";
import { PageContainer, PageHeader } from "@/components/layout/page-header";

interface CoverageListClientProps {
  coverages: {
    id: string;
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
  return "$" + value.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

const TYPE_FILTERS = ["All", "Feature", "Mention", "Review", "Social"];

export function CoverageListClient({
  coverages,
  stats,
  campaigns,
  contacts,
}: CoverageListClientProps) {
  const [addOpen, setAddOpen] = useState(false);
  const [typeFilter, setTypeFilter] = useState("All");
  const [campaignFilter, setCampaignFilter] = useState("All");
  const router = useRouter();

  const filtered = coverages.filter((c) => {
    if (typeFilter !== "All" && c.type.toLowerCase() !== typeFilter.toLowerCase()) return false;
    if (campaignFilter !== "All" && c.campaignId !== campaignFilter) return false;
    return true;
  });

  function handleSuccess() {
    setAddOpen(false);
    router.refresh();
  }

  const selectStyle = {
    height: 32,
    padding: "0 30px 0 14px",
    fontSize: 12,
    fontWeight: 600 as const,
    borderRadius: 999,
    border: "none",
    backgroundColor: "var(--surface-container-low)",
    color: "var(--text-sub)",
    outline: "none",
    appearance: "none" as const,
    backgroundImage:
      "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23999' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E\")",
    backgroundRepeat: "no-repeat",
    backgroundPosition: "right 10px center",
    cursor: "pointer" as const,
  };

  return (
    <PageContainer>
      <PageHeader
        title="Coverage"
        subtitle="Hits earned, press logged, value tracked."
        actions={
          <Button variant="primary" size="sm" icon="plus" onClick={() => setAddOpen(true)}>
            Add coverage
          </Button>
        }
      />

      <StatsBar
        stats={[
          { value: stats.total, label: "Total hits" },
          { value: formatMediaValue(stats.totalMediaValue), label: "Media value" },
          { value: stats.thisMonthCount, label: "This month" },
          { value: stats.topPublication ?? "—", label: "Top publication" },
        ]}
      />

      <div className="flex items-center gap-3 flex-wrap">
        <FilterPills options={TYPE_FILTERS} selected={typeFilter} onChange={setTypeFilter} />
        <select
          value={campaignFilter}
          onChange={(e) => setCampaignFilter(e.target.value)}
          style={selectStyle}
        >
          <option value="All">All campaigns</option>
          {campaigns.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      {/* Coverage cards */}
      {filtered.length > 0 ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {filtered.map((coverage) => (
            <CoverageCard
              key={coverage.id}
              coverage={coverage}
              campaigns={campaigns}
              contacts={contacts}
            />
          ))}
        </div>
      ) : coverages.length === 0 ? (
        <EmptyState icon="coverage" title="No coverage logged yet" description="Log your first media hit to start tracking coverage." />
      ) : (
        <EmptyState icon="coverage" title="No coverage matches these filters" description="Try adjusting the type or campaign filter." />
      )}

      {/* Add coverage panel */}
      <SlideOverPanel open={addOpen} onClose={() => setAddOpen(false)} title="Add Coverage">
        {addOpen && (
          <CoverageForm campaigns={campaigns} contacts={contacts} onSuccess={handleSuccess} />
        )}
      </SlideOverPanel>
    </PageContainer>
  );
}
