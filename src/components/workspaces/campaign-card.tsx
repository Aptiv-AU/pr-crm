import { Card } from "@/components/ui/card";
import { Badge, type BadgeVariant } from "@/components/ui/badge";

interface CampaignCardProps {
  campaign: {
    id: string;
    name: string;
    type: string;
    status: string;
    dueDate: Date | null;
    campaignContacts: { id: string }[];
    outreaches: { status: string }[];
    coverages: { id: string }[];
  };
}

const statusVariantMap: Record<string, BadgeVariant> = {
  active: "active",
  outreach: "outreach",
  draft: "draft",
};

export function CampaignCard({ campaign }: CampaignCardProps) {
  const totalOutreaches = campaign.outreaches.length;
  const nonDraftOutreaches = campaign.outreaches.filter(
    (o) => o.status !== "draft"
  ).length;
  const progress =
    totalOutreaches > 0
      ? Math.round((nonDraftOutreaches / totalOutreaches) * 100)
      : 0;

  const repliedCount = campaign.outreaches.filter(
    (o) => o.status === "replied"
  ).length;

  const dueFormatted = campaign.dueDate
    ? new Date(campaign.dueDate).toLocaleDateString("en-AU", {
        month: "short",
        day: "numeric",
      })
    : "\u2014";

  return (
    <Card style={{ padding: "14px 16px" }}>
      {/* Type label */}
      <div
        style={{
          fontSize: 11,
          fontWeight: 600,
          textTransform: "uppercase",
          letterSpacing: "0.05em",
          color: "var(--text-muted-custom)",
          marginBottom: 4,
        }}
      >
        {campaign.type}
      </div>

      {/* Name + status */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
        <div
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
        </div>
        <Badge variant={statusVariantMap[campaign.status] ?? "default"}>
          {campaign.status}
        </Badge>
      </div>

      {/* Progress bar */}
      <div
        style={{
          height: 3,
          borderRadius: 2,
          backgroundColor: "var(--border-custom)",
          marginBottom: 12,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${progress}%`,
            borderRadius: 2,
            backgroundColor: "var(--accent-custom)",
            transition: "width 300ms ease",
          }}
        />
      </div>

      {/* Metrics grid */}
      <div className="grid grid-cols-4 gap-2">
        {[
          { label: "Contacts", value: campaign.campaignContacts.length },
          { label: "Replies", value: repliedCount },
          { label: "Coverage", value: campaign.coverages.length },
          { label: "Due", value: dueFormatted },
        ].map((metric) => (
          <div key={metric.label} style={{ textAlign: "center" }}>
            <div
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: "var(--text-primary)",
                lineHeight: 1.3,
              }}
            >
              {metric.value}
            </div>
            <div
              style={{
                fontSize: 10,
                color: "var(--text-muted-custom)",
                lineHeight: 1.3,
              }}
            >
              {metric.label}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
