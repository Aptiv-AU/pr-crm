"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge, type BadgeVariant } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { StatsBar } from "@/components/shared/stats-bar";
import { FilterPills } from "@/components/shared/filter-pills";
import { SlideOverPanel } from "@/components/shared/slide-over-panel";
import { EmptyState } from "@/components/shared/empty-state";
import { CampaignForm } from "@/components/campaigns/campaign-form";
import { ClientBadge } from "@/components/shared/client-badge";

interface CampaignRow {
  id: string;
  name: string;
  type: string;
  status: string;
  budget: number | null;
  dueDate: string | null;
  client: { id: string; name: string; initials: string; colour: string; bgColour: string; logo?: string | null };
  contactCount: number;
  outreachCount: number;
  coverageCount: number;
}

interface CampaignsListClientProps {
  campaigns: CampaignRow[];
  stats: { total: number; active: number; draft: number; complete: number };
  types: string[];
  clients: { id: string; name: string; initials: string; colour: string; bgColour: string }[];
}

const statusVariantMap: Record<string, BadgeVariant> = {
  active: "active",
  outreach: "outreach",
  draft: "draft",
  complete: "default",
};

const STATUS_LABELS: Record<"active" | "complete" | "all", string> = {
  active: "In Progress",
  complete: "Completed",
  all: "All",
};
const LABEL_TO_STATUS: Record<string, "active" | "complete" | "all"> = {
  "In Progress": "active",
  "Completed": "complete",
  "All": "all",
};

function formatBudget(budget: number | null): string {
  if (budget == null) return "\u2014";
  return `$${budget.toLocaleString()} budget`;
}

function formatDueDate(dueDate: string | null): string | null {
  if (!dueDate) return null;
  const d = new Date(dueDate);
  return `Due ${d.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
}

export function CampaignsListClient({ campaigns, stats, types, clients }: CampaignsListClientProps) {
  const router = useRouter();
  const [selectedType, setSelectedType] = useState("All");
  const [selectedClientId, setSelectedClientId] = useState("All");
  const [statusFilter, setStatusFilter] = useState<"active" | "complete" | "all">("active");
  const [addOpen, setAddOpen] = useState(false);

  const filtered = useMemo(() => {
    let result = campaigns;
    if (statusFilter === "active") result = result.filter((c) => c.status !== "complete");
    else if (statusFilter === "complete") result = result.filter((c) => c.status === "complete");
    if (selectedType !== "All") {
      result = result.filter((c) => c.type === selectedType);
    }
    if (selectedClientId !== "All") {
      result = result.filter((c) => c.client.id === selectedClientId);
    }
    return result;
  }, [campaigns, selectedType, selectedClientId, statusFilter]);

  function handleSuccess() {
    setAddOpen(false);
    router.refresh();
  }

  return (
    <div className="p-4 md:p-6">
      {/* Header row */}
      <div className="flex items-center justify-end" style={{ marginBottom: 16 }}>
        <Button variant="primary" size="sm" icon="plus" onClick={() => setAddOpen(true)}>
          New campaign
        </Button>
      </div>

      {/* Stats */}
      <div style={{ marginBottom: 16 }}>
        <StatsBar
          stats={[
            { value: stats.total, label: "Total" },
            { value: stats.active, label: "Active" },
            { value: stats.draft, label: "Draft" },
            { value: stats.complete, label: "Complete" },
          ]}
        />
      </div>

      {/* Status filter chips */}
      <div style={{ marginBottom: 16 }}>
        <FilterPills
          options={["In Progress", "Completed", "All"]}
          selected={STATUS_LABELS[statusFilter]}
          onChange={(v) => setStatusFilter(LABEL_TO_STATUS[v] ?? "active")}
        />
      </div>

      {/* Filter row */}
      <div className="flex items-center gap-3" style={{ marginBottom: 12 }}>
        <FilterPills
          options={["All", ...types]}
          selected={selectedType}
          onChange={setSelectedType}
        />
        <select
          value={selectedClientId}
          onChange={(e) => setSelectedClientId(e.target.value)}
          style={{
            height: 26,
            padding: "0 24px 0 8px",
            fontSize: 11,
            fontWeight: 500,
            borderRadius: 13,
            border: "1px solid var(--border-custom)",
            backgroundColor: "transparent",
            color: "var(--text-sub)",
            appearance: "none" as const,
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='%23888' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")`,
            backgroundRepeat: "no-repeat",
            backgroundPosition: "right 8px center",
            cursor: "pointer",
            flexShrink: 0,
          }}
        >
          <option value="All">All clients</option>
          {clients.map((client) => (
            <option key={client.id} value={client.id}>
              {client.name}
            </option>
          ))}
        </select>
      </div>

      {/* Campaign cards grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {filtered.map((campaign) => {
          const dueDateFormatted = formatDueDate(campaign.dueDate);
          return (
            <Link
              key={campaign.id}
              href={`/campaigns/${campaign.id}`}
              style={{ textDecoration: "none" }}
            >
              <Card
                style={{
                  padding: 16,
                  cursor: "pointer",
                  transition: "border-color 150ms ease",
                }}
                className="hover:!border-[var(--border-mid)]"
              >
                {/* Top row: client badge + name + type */}
                <div className="flex items-center gap-2" style={{ marginBottom: 8 }}>
                  <ClientBadge client={campaign.client} size={28} />
                  <span
                    style={{
                      fontSize: 14,
                      fontWeight: 600,
                      color: "var(--text-primary)",
                      flex: 1,
                      minWidth: 0,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {campaign.name}
                  </span>
                  <Badge variant="default">{campaign.type}</Badge>
                </div>

                {/* Status + budget */}
                <div className="flex items-center gap-2" style={{ marginBottom: 4 }}>
                  <Badge variant={statusVariantMap[campaign.status] ?? "default"}>
                    {campaign.status}
                  </Badge>
                  <span style={{ fontSize: 12, color: "var(--text-muted-custom)" }}>
                    {formatBudget(campaign.budget)}
                  </span>
                </div>

                {/* Due date */}
                {dueDateFormatted && (
                  <div style={{ fontSize: 12, color: "var(--text-muted-custom)", marginBottom: 4 }}>
                    {dueDateFormatted}
                  </div>
                )}

                {/* Metrics */}
                <div className="flex gap-4" style={{ marginTop: 8 }}>
                  {[
                    { label: "Contacts", value: campaign.contactCount },
                    { label: "Outreach", value: campaign.outreachCount },
                    { label: "Coverage", value: campaign.coverageCount },
                  ].map((metric) => (
                    <div key={metric.label}>
                      <span
                        style={{
                          fontSize: 13,
                          fontWeight: 600,
                          color: "var(--text-primary)",
                          marginRight: 3,
                        }}
                      >
                        {metric.value}
                      </span>
                      <span style={{ fontSize: 11, color: "var(--text-muted-custom)" }}>
                        {metric.label}
                      </span>
                    </div>
                  ))}
                </div>
              </Card>
            </Link>
          );
        })}
      </div>

      {filtered.length === 0 && (
        campaigns.length > 0 ? (
          <EmptyState icon="campaigns" title="No campaigns match these filters" description="Try adjusting the type or client filter." />
        ) : (
          <EmptyState icon="campaigns" title="No campaigns yet" description="Create your first campaign to start tracking work." />
        )
      )}

      {/* Add campaign slide-over */}
      <SlideOverPanel open={addOpen} onClose={() => setAddOpen(false)} title="New Campaign">
        {addOpen && <CampaignForm clients={clients} onSuccess={handleSuccess} />}
      </SlideOverPanel>
    </div>
  );
}
