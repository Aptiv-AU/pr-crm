import Link from "next/link";
import { Badge, type BadgeVariant } from "@/components/ui/badge";
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
};

export function CampaignCard({ campaign, client }: CampaignCardProps) {
  const pitches = campaign.outreaches.length;
  const responses = campaign.outreaches.filter((o) => o.status === "replied").length;
  const coverage = campaign.coverages.length;

  const href = `/campaigns/${campaign.slug ?? campaign.id}`;

  const metaParts = [
    `${pitches} ${pitches === 1 ? "pitch" : "pitches"}`,
    `${responses} ${responses === 1 ? "response" : "responses"}`,
    `${coverage} coverage`,
  ];

  return (
    <Link
      href={href}
      className="block"
      style={{
        display: "block",
        padding: "14px 16px",
        minHeight: 64,
        borderRadius: 10,
        border: "1px solid var(--border-custom)",
        backgroundColor: "var(--card-bg)",
        textDecoration: "none",
        color: "inherit",
        transition: "border-color 150ms ease, background-color 150ms ease",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = "var(--border-mid)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = "var(--border-custom)";
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        {client && <ClientBadge client={client} size={28} />}
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
          {titleCase(campaign.status)}
        </Badge>
      </div>

      <div
        style={{
          marginTop: 6,
          paddingLeft: client ? 38 : 0,
          fontSize: 12,
          color: "var(--text-muted-custom)",
          lineHeight: 1.4,
        }}
      >
        {metaParts.join(" · ")}
      </div>
    </Link>
  );
}
