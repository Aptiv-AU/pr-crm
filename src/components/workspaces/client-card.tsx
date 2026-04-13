"use client";

import Link from "next/link";
import { Icon } from "@/components/ui/icon";
import { Badge, type BadgeVariant } from "@/components/ui/badge";

interface Campaign {
  id: string;
  name: string;
  status: string;
}

interface ClientCardProps {
  client: {
    id: string;
    name: string;
    industry: string;
    colour: string;
    bgColour: string;
    initials: string;
    campaigns: Campaign[];
    _count: { campaigns: number };
  };
  contactCount: number;
}

const statusVariantMap: Record<string, BadgeVariant> = {
  active: "active",
  outreach: "outreach",
  draft: "draft",
};

export function ClientCard({ client, contactCount }: ClientCardProps) {
  const activeCampaigns = client.campaigns
    .filter((c) => c.status !== "complete")
    .slice(0, 2);

  return (
    <Link
      href={`/workspaces/${client.id}`}
      className="block rounded-[10px] transition-colors"
      style={{
        border: "1px solid var(--border-custom)",
        backgroundColor: "var(--card-bg)",
        textDecoration: "none",
        color: "inherit",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.borderColor = "var(--border-mid)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.borderColor = "var(--border-custom)";
      }}
    >
      {/* Client Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "14px 16px",
        }}
      >
        {/* Initials Badge */}
        <div
          style={{
            width: 38,
            height: 38,
            borderRadius: 9,
            backgroundColor: client.bgColour,
            color: client.colour,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 13,
            fontWeight: 600,
            flexShrink: 0,
          }}
        >
          {client.initials}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: 14,
              fontWeight: 600,
              color: "var(--text-primary)",
              lineHeight: 1.3,
            }}
          >
            {client.name}
          </div>
          <div
            style={{
              fontSize: 11,
              color: "var(--text-muted-custom)",
              lineHeight: 1.3,
            }}
          >
            {client.industry}
          </div>
        </div>

        <Icon name="chevronR" size={14} color="var(--text-muted-custom)" />
      </div>

      {/* Stats Strip */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr",
          gap: 1,
          backgroundColor: "var(--border-custom)",
          borderTop: "1px solid var(--border-custom)",
          borderBottom: activeCampaigns.length > 0 ? "1px solid var(--border-custom)" : "none",
        }}
      >
        {[
          { label: "Contacts", value: contactCount },
          { label: "Campaigns", value: client._count.campaigns },
          { label: "Coverage", value: 0 },
        ].map((stat) => (
          <div
            key={stat.label}
            style={{
              backgroundColor: "var(--page-bg)",
              padding: "8px 12px",
              textAlign: "center" as const,
            }}
          >
            <div
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: "var(--text-primary)",
                lineHeight: 1.3,
              }}
            >
              {stat.value}
            </div>
            <div
              style={{
                fontSize: 10,
                color: "var(--text-muted-custom)",
                lineHeight: 1.3,
              }}
            >
              {stat.label}
            </div>
          </div>
        ))}
      </div>

      {/* Active Campaigns */}
      {activeCampaigns.length > 0 && (
        <div style={{ padding: "10px 16px", display: "flex", flexDirection: "column" as const, gap: 6 }}>
          {activeCampaigns.map((campaign) => (
            <div
              key={campaign.id}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 8,
              }}
            >
              <span
                style={{
                  fontSize: 12,
                  color: "var(--text-sub)",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap" as const,
                  minWidth: 0,
                }}
              >
                {campaign.name}
              </span>
              <Badge variant={statusVariantMap[campaign.status] ?? "default"}>
                {campaign.status}
              </Badge>
            </div>
          ))}
        </div>
      )}
    </Link>
  );
}
