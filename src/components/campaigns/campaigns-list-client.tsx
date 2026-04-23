"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge, type BadgeVariant } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { FilterPills } from "@/components/shared/filter-pills";
import { SlideOverPanel } from "@/components/shared/slide-over-panel";
import { EmptyState } from "@/components/shared/empty-state";
import { CampaignForm } from "@/components/campaigns/campaign-form";
import { ClientBadge } from "@/components/shared/client-badge";
import { titleCase } from "@/lib/format/title-case";
import { PageContainer, PageHeader } from "@/components/layout/page-header";

interface CampaignRow {
  id: string;
  slug: string;
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

function formatDueDate(dueDate: string | null): string | null {
  if (!dueDate) return null;
  const d = new Date(dueDate);
  return `Due ${d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;
}

function formatCurrencyShort(value: number): string {
  if (value >= 1000) {
    const k = value / 1000;
    return `A$${k % 1 === 0 ? k.toFixed(0) : k.toFixed(1)}k`;
  }
  return `A$${value.toLocaleString()}`;
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

  const quarterBudget = useMemo(() => {
    const total = campaigns
      .filter((c) => c.status !== "complete")
      .reduce((sum, c) => sum + (c.budget ?? 0), 0);
    return total;
  }, [campaigns]);

  const meta = [
    { label: "Active", value: String(stats.active) },
    { label: "Draft", value: String(stats.draft) },
    { label: "This quarter", value: formatCurrencyShort(quarterBudget) },
  ];

  function handleSuccess() {
    setAddOpen(false);
    router.refresh();
  }

  const activeStatusLabel = STATUS_LABELS[statusFilter];

  return (
    <PageContainer>
      <PageHeader
        eyebrow="Workspace"
        title="Campaigns"
        subtitle="Every pitch is a chapter."
        meta={meta}
        actions={
          <>
            <Button
              variant="default"
              size="sm"
              icon="filter"
              onClick={() => {
                const order: Array<"active" | "complete" | "all"> = ["active", "complete", "all"];
                const i = order.indexOf(statusFilter);
                setStatusFilter(order[(i + 1) % order.length]);
              }}
            >
              {activeStatusLabel}
            </Button>
            <Button variant="primary" size="sm" icon="plus" onClick={() => setAddOpen(true)}>
              New campaign
            </Button>
          </>
        }
      />

      <FilterPills
        options={["In Progress", "Completed", "All"]}
        selected={STATUS_LABELS[statusFilter]}
        onChange={(v) => setStatusFilter(LABEL_TO_STATUS[v] ?? "active")}
      />

      <div className="flex items-center gap-3 flex-wrap">
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

      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {filtered.map((campaign) => {
          const dueDateFormatted = formatDueDate(campaign.dueDate);
          const hasBudget = campaign.budget != null && campaign.budget > 0;
          return (
            <Link
              key={campaign.id}
              href={`/campaigns/${campaign.slug}`}
              style={{ textDecoration: "none" }}
            >
              <Card style={{ padding: 22, cursor: "pointer" }}>
                <div
                  className="flex items-center gap-3 flex-wrap"
                  style={{ marginBottom: 4 }}
                >
                  <ClientBadge client={campaign.client} size={32} />
                  <span
                    style={{
                      fontSize: 17,
                      fontWeight: 800,
                      letterSpacing: "-0.01em",
                      color: "var(--text-primary)",
                    }}
                  >
                    {campaign.name}
                  </span>
                  <Badge variant="default">{titleCase(campaign.type)}</Badge>
                  <Badge variant={statusVariantMap[campaign.status] ?? "default"}>
                    {titleCase(campaign.status)}
                  </Badge>
                </div>

                <div
                  style={{
                    fontSize: 13,
                    fontStyle: "italic",
                    fontWeight: 500,
                    color: "var(--text-sub)",
                    marginBottom: 14,
                  }}
                >
                  {campaign.client.name}
                </div>

                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 500,
                    color: hasBudget ? "var(--text-sub)" : "var(--text-muted-custom)",
                  }}
                >
                  {hasBudget
                    ? `Budget A$${(campaign.budget as number).toLocaleString()}`
                    : "No budget set"}
                </div>

                {dueDateFormatted && (
                  <div
                    style={{
                      fontSize: 12,
                      fontWeight: 500,
                      color: "var(--text-sub)",
                      margin: "12px 0 4px",
                    }}
                  >
                    {dueDateFormatted}
                  </div>
                )}

                <div
                  style={{
                    display: "flex",
                    gap: 16,
                    marginTop: 14,
                    paddingTop: 14,
                    borderTop: "1px solid var(--border-custom)",
                  }}
                >
                  {[
                    { label: "Contacts", value: campaign.contactCount },
                    { label: "Outreach", value: campaign.outreachCount },
                    { label: "Coverage", value: campaign.coverageCount },
                  ].map((metric) => (
                    <div key={metric.label} style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
                      <span
                        style={{
                          fontSize: 14,
                          fontWeight: 700,
                          color: "var(--text-primary)",
                        }}
                      >
                        {metric.value}
                      </span>
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 800,
                          textTransform: "uppercase",
                          letterSpacing: "0.08em",
                          color: "var(--text-muted-custom)",
                        }}
                      >
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

      <SlideOverPanel open={addOpen} onClose={() => setAddOpen(false)} title="New Campaign">
        {addOpen && <CampaignForm clients={clients} onSuccess={handleSuccess} />}
      </SlideOverPanel>
    </PageContainer>
  );
}
