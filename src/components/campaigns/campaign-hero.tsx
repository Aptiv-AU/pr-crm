"use client";

import { Badge, type BadgeVariant } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

interface CampaignHeroProps {
  campaign: {
    id: string;
    name: string;
    type: string;
    status: string;
    startDate: Date | string | null;
    dueDate: Date | string | null;
    client: {
      id: string;
      name: string;
      initials: string;
      colour: string;
      bgColour: string;
    };
  };
  budgetStats: { spent: number; total: number | null };
  onEdit: () => void;
}

const statusVariantMap: Record<string, BadgeVariant> = {
  active: "active",
  outreach: "outreach",
  draft: "draft",
  complete: "default",
};

function formatDate(date: Date | string | null): string | null {
  if (!date) return null;
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    minimumFractionDigits: 0,
  }).format(value);
}

export function CampaignHero({ campaign, budgetStats, onEdit }: CampaignHeroProps) {
  const startFormatted = formatDate(campaign.startDate);
  const dueFormatted = formatDate(campaign.dueDate);

  const dateDisplay =
    startFormatted && dueFormatted
      ? `${startFormatted} — ${dueFormatted}`
      : startFormatted || dueFormatted || "No dates set";

  const spentPercent =
    budgetStats.total && budgetStats.total > 0
      ? Math.min(100, (budgetStats.spent / budgetStats.total) * 100)
      : 0;

  return (
    <Card style={{ padding: 20 }}>
      {/* Top row */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
        <div
          style={{
            width: 20,
            height: 20,
            borderRadius: 5,
            backgroundColor: campaign.client.bgColour,
            color: campaign.client.colour,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 9,
            fontWeight: 600,
            flexShrink: 0,
          }}
        >
          {campaign.client.initials}
        </div>
        <span style={{ fontSize: 18, fontWeight: 700, color: "var(--text-primary)" }}>
          {campaign.name}
        </span>
        <Badge variant="default">{campaign.type}</Badge>
        <Badge variant={statusVariantMap[campaign.status] ?? "default"}>
          {campaign.status === "complete" ? "Complete" : campaign.status}
        </Badge>
      </div>

      {/* Client name */}
      <div style={{ fontSize: 12, color: "var(--text-sub)", marginBottom: 14 }}>
        {campaign.client.name}
      </div>

      {/* Budget row */}
      <div style={{ marginBottom: 10 }}>
        {budgetStats.total && budgetStats.total > 0 ? (
          <>
            <div style={{ fontSize: 12, color: "var(--text-sub)", marginBottom: 4 }}>
              Spent {formatCurrency(budgetStats.spent)} of {formatCurrency(budgetStats.total)}
            </div>
            <div
              style={{
                height: 3,
                borderRadius: 2,
                backgroundColor: "var(--border-custom)",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  height: "100%",
                  width: `${spentPercent}%`,
                  backgroundColor: "var(--accent-custom)",
                  borderRadius: 2,
                  transition: "width 300ms ease",
                }}
              />
            </div>
          </>
        ) : (
          <div style={{ fontSize: 12, color: "var(--text-muted-custom)" }}>No budget set</div>
        )}
      </div>

      {/* Date range */}
      <div
        style={{
          fontSize: 12,
          color: dateDisplay === "No dates set" ? "var(--text-muted-custom)" : "var(--text-sub)",
          marginBottom: 16,
        }}
      >
        {dateDisplay}
      </div>

      {/* Actions */}
      <div style={{ display: "flex", gap: 8 }}>
        <Button variant="default" size="sm" icon="edit" onClick={onEdit}>
          Edit
        </Button>
        <Button
          variant="default"
          size="sm"
          icon="campaigns"
          onClick={() => window.open(`/api/reports/${campaign.id}`, "_blank")}
        >
          Export report
        </Button>
      </div>
    </Card>
  );
}
