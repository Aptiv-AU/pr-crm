import Link from "next/link";
import { Badge, type BadgeVariant } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ClientBadge } from "@/components/shared/client-badge";
import { titleCase } from "@/lib/format/title-case";

interface CampaignCardProps {
  campaign: {
    id: string;
    slug?: string;
    name: string;
    status: string;
    campaignContacts: { id: string }[];
    outreaches: { status: string }[];
    coverages: { id: string }[];
  };
  client?: {
    name: string;
    initials: string;
    colour: string;
    bgColour: string;
    logo?: string | null;
  };
}

const statusVariantMap: Record<string, BadgeVariant> = {
  active: "active",
  outreach: "outreach",
  draft: "draft",
  approved: "outreach",
  sent: "active",
  replied: "warm",
  complete: "default",
};

export function CampaignCard({ campaign, client }: CampaignCardProps) {
  const pitches = campaign.outreaches.length;
  const responses = campaign.outreaches.filter((o) => o.status === "replied").length;
  const coverage = campaign.coverages.length;
  const contacts = campaign.campaignContacts.length;

  const href = `/campaigns/${campaign.slug ?? campaign.id}`;

  const metrics: { label: string; value: number }[] = [
    { label: "Contacts", value: contacts },
    { label: "Outreach", value: pitches },
    { label: "Replies", value: responses },
    { label: "Coverage", value: coverage },
  ];

  return (
    <Link href={href} style={{ textDecoration: "none" }}>
      <Card style={{ padding: 18, cursor: "pointer" }}>
        <div
          className="flex items-center gap-2 flex-wrap"
          style={{ marginBottom: 10 }}
        >
          {client && <ClientBadge client={client} size={28} />}
          <span
            style={{
              fontSize: 15,
              fontWeight: 800,
              letterSpacing: "-0.01em",
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
          <Badge variant={statusVariantMap[campaign.status] ?? "default"}>
            {titleCase(campaign.status)}
          </Badge>
        </div>

        <div
          style={{
            display: "flex",
            gap: 16,
            flexWrap: "wrap",
          }}
        >
          {metrics.map((metric) => (
            <div
              key={metric.label}
              style={{ display: "flex", alignItems: "baseline", gap: 4 }}
            >
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
}
