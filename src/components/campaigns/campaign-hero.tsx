"use client";

import { Badge, type BadgeVariant } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ClientBadge } from "@/components/shared/client-badge";
import { CampaignPhaseStepper } from "@/components/campaigns/campaign-phase-stepper";

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
      : startFormatted || dueFormatted || "No dates set";

  const spentPercent =
    budgetStats.total && budgetStats.total > 0
      ? Math.min(100, (budgetStats.spent / budgetStats.total) * 100)
      : 0;

  return (
    <Card style={{ padding: 24 }}>
      {/* Top row */}
      <div className="flex items-center gap-3 flex-wrap" style={{ marginBottom: 4 }}>
        <ClientBadge client={campaign.client} size={44} />
        <span
          className="text-2xl md:text-[28px] font-extrabold tracking-tight"
          style={{ color: "var(--text-primary)" }}
        >
          {campaign.name}
        </span>
        <Badge variant="default">{campaign.type}</Badge>
        <Badge variant={statusVariantMap[campaign.status] ?? "default"}>
          {campaign.status === "complete" ? "Complete" : campaign.status}
        </Badge>
      </div>

      {/* Client name */}
      <div className="text-sm italic font-medium" style={{ color: "var(--text-sub)", marginBottom: 18 }}>
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
        {campaign.status !== "complete" ? (
          <Button variant="default" size="sm" onClick={onComplete}>
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
        <div style={{ marginTop: 16, borderTop: "1px solid var(--border-custom)", paddingTop: 14 }}>
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
