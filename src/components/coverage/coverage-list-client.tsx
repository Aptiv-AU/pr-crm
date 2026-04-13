"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { StatsBar } from "@/components/shared/stats-bar";
import { FilterPills } from "@/components/shared/filter-pills";
import { SlideOverPanel } from "@/components/shared/slide-over-panel";
import { CoverageForm } from "./coverage-form";
import { CoverageCard } from "./coverage-card";

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
    height: 28,
    padding: "0 28px 0 10px",
    fontSize: 12,
    fontWeight: 500 as const,
    borderRadius: 7,
    border: "1px solid var(--border-custom)",
    backgroundColor: "var(--page-bg)",
    color: "var(--text-sub)",
    outline: "none",
    appearance: "none" as const,
    backgroundImage:
      "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23999' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E\")",
    backgroundRepeat: "no-repeat",
    backgroundPosition: "right 8px center",
    cursor: "pointer" as const,
  };

  return (
    <div className="p-4 md:p-6">
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 16,
        }}
      >
        <h1 style={{ fontSize: 18, fontWeight: 700, color: "var(--text-primary)" }}>Coverage</h1>
        <Button variant="primary" size="sm" icon="plus" onClick={() => setAddOpen(true)}>
          Add coverage
        </Button>
      </div>

      {/* Stats */}
      <div style={{ marginBottom: 16 }}>
        <StatsBar
          stats={[
            { value: stats.total, label: "Total hits" },
            { value: formatMediaValue(stats.totalMediaValue), label: "Media value" },
            { value: stats.thisMonthCount, label: "This month" },
            { value: stats.topPublication ?? "—", label: "Top publication" },
          ]}
        />
      </div>

      {/* Filters */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          marginBottom: 16,
          flexWrap: "wrap",
        }}
      >
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
      ) : (
        <div
          style={{
            textAlign: "center",
            padding: "40px 20px",
            color: "var(--text-muted-custom)",
            fontSize: 13,
          }}
        >
          {coverages.length === 0 ? "No coverage logged yet" : "No coverage matches the current filters"}
        </div>
      )}

      {/* Add coverage panel */}
      <SlideOverPanel open={addOpen} onClose={() => setAddOpen(false)} title="Add Coverage">
        {addOpen && (
          <CoverageForm campaigns={campaigns} contacts={contacts} onSuccess={handleSuccess} />
        )}
      </SlideOverPanel>
    </div>
  );
}
