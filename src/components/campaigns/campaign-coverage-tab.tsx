"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { StatsBar } from "@/components/shared/stats-bar";
import { SlideOverPanel } from "@/components/shared/slide-over-panel";
import { CoverageForm } from "@/components/coverage/coverage-form";
import { CoverageCard } from "@/components/coverage/coverage-card";

interface CampaignCoverageTabProps {
  campaignId: string;
  campaignName: string;
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
    contact: { id: string; name: string } | null;
  }[];
  contacts: { id: string; name: string }[];
}

function formatMediaValue(value: number): string {
  return "$" + value.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

export function CampaignCoverageTab({
  campaignId,
  campaignName,
  coverages,
  contacts,
}: CampaignCoverageTabProps) {
  const [addOpen, setAddOpen] = useState(false);
  const router = useRouter();

  const totalMediaValue = coverages.reduce(
    (sum, c) => sum + (c.mediaValue ? Number(c.mediaValue) : 0),
    0
  );

  const pubCounts: Record<string, number> = {};
  for (const c of coverages) {
    pubCounts[c.publication] = (pubCounts[c.publication] || 0) + 1;
  }
  const topPublication =
    Object.entries(pubCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

  const campaigns = [{ id: campaignId, name: campaignName }];

  function handleSuccess() {
    setAddOpen(false);
    router.refresh();
  }

  return (
    <div>
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 16,
        }}
      >
        <div />
        <Button variant="primary" size="sm" icon="plus" onClick={() => setAddOpen(true)}>
          Add coverage
        </Button>
      </div>

      {/* Stats */}
      {coverages.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <StatsBar
            stats={[
              { value: coverages.length, label: "Total hits" },
              { value: formatMediaValue(totalMediaValue), label: "Total media value" },
              { value: topPublication ?? "—", label: "Top publication" },
            ]}
          />
        </div>
      )}

      {/* Coverage cards */}
      {coverages.length > 0 ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {coverages.map((coverage) => (
            <CoverageCard
              key={coverage.id}
              coverage={{
                ...coverage,
                campaign: {
                  id: campaignId,
                  name: campaignName,
                  client: { id: "", name: "", initials: "", colour: "", bgColour: "" },
                },
              }}
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
          No coverage logged yet for this campaign
        </div>
      )}

      {/* Add coverage panel */}
      <SlideOverPanel open={addOpen} onClose={() => setAddOpen(false)} title="Add Coverage">
        {addOpen && (
          <CoverageForm
            campaigns={campaigns}
            contacts={contacts}
            onSuccess={handleSuccess}
          />
        )}
      </SlideOverPanel>
    </div>
  );
}
