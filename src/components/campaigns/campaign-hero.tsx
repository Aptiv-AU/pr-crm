"use client";

import { Badge, type BadgeVariant } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ClientBadge } from "@/components/shared/client-badge";
import { CampaignPhaseStepper } from "@/components/campaigns/campaign-phase-stepper";
import { titleCase } from "@/lib/format/title-case";

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
      logo?: string | null;
    };
    phases: { id: string; name: string; order: number; status: string }[];
  };
  budgetStats: { spent: number; total: number | null };
  onEdit: () => void;
  onAdvancePhase: (phaseId: string) => void;
  onRevertPhase: (phaseId: string) => void;
  onComplete: () => void;
  onReopen: () => void;
  onArchive: () => void;
  isPending?: boolean;
}

const TEAL = "#006C49";

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

export function CampaignHero({ campaign, budgetStats, onEdit, onAdvancePhase, onRevertPhase, onComplete, onReopen, onArchive, isPending }: CampaignHeroProps) {
  const startFormatted = formatDate(campaign.startDate);
  const dueFormatted = formatDate(campaign.dueDate);

  const dateDisplay =
    startFormatted && dueFormatted
      ? `${startFormatted} — ${dueFormatted}`
      : startFormatted || dueFormatted || null;

  const spentPercent =
    budgetStats.total && budgetStats.total > 0
      ? Math.min(100, (budgetStats.spent / budgetStats.total) * 100)
      : 0;

  return (
    <Card style={{ padding: 24 }}>
      <div className="flex items-center gap-3 flex-wrap" style={{ marginBottom: 6 }}>
        <ClientBadge client={campaign.client} size={40} />
        <span
          style={{
            fontSize: 22,
            fontWeight: 800,
            letterSpacing: "-0.015em",
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
          fontSize: 14,
          fontStyle: "italic",
          fontWeight: 500,
          color: "var(--text-sub)",
          marginBottom: 16,
        }}
      >
        {campaign.client.name}
      </div>

      {budgetStats.total && budgetStats.total > 0 ? (
        <>
          <div
            style={{
              fontSize: 12,
              fontWeight: 500,
              color: "var(--text-sub)",
              marginBottom: 6,
            }}
          >
            Spent {formatCurrency(budgetStats.spent)} of {formatCurrency(budgetStats.total)}
          </div>
          <div
            style={{
              height: 4,
              borderRadius: 999,
              backgroundColor: "var(--surface-container)",
              overflow: "hidden",
              marginBottom: 12,
            }}
          >
            <div
              style={{
                height: "100%",
                width: `${spentPercent}%`,
                backgroundColor: TEAL,
                borderRadius: 999,
                transition: "width 300ms ease",
              }}
            />
          </div>
        </>
      ) : (
        <div
          style={{
            fontSize: 12,
            fontWeight: 500,
            color: "var(--text-muted-custom)",
            marginBottom: 12,
          }}
        >
          No budget set
        </div>
      )}

      {dateDisplay && (
        <div
          style={{
            fontSize: 12,
            fontWeight: 500,
            color: "var(--text-sub)",
            marginBottom: 18,
          }}
        >
          {dateDisplay}
        </div>
      )}

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <Button variant="default" size="sm" icon="edit" onClick={onEdit}>
          Edit
        </Button>
        <Button
          variant="default"
          size="sm"
          icon="file"
          onClick={() => window.open(`/api/reports/${campaign.id}`, "_blank")}
        >
          Export report
        </Button>
        {campaign.status !== "complete" ? (
          <Button variant="primary" size="sm" icon="check" onClick={onComplete}>
            Complete
          </Button>
        ) : (
          <Button variant="default" size="sm" onClick={onReopen}>
            Re-open
          </Button>
        )}
        <Button variant="ghost" size="sm" onClick={onArchive}>
          Archive
        </Button>
      </div>

      {campaign.phases.length > 0 && (
        <div
          style={{
            marginTop: 20,
            borderTop: "1px solid var(--border-custom)",
            paddingTop: 18,
          }}
        >
          <CampaignPhaseStepper
            phases={campaign.phases}
            isPending={isPending}
            onAdvance={onAdvancePhase}
            onRevert={onRevertPhase}
          />
        </div>
      )}
    </Card>
  );
}
