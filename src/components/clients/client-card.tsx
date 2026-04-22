"use client";

import Link from "next/link";
import { Icon } from "@/components/ui/icon";
import { Badge, type BadgeVariant } from "@/components/ui/badge";
import { titleCase } from "@/lib/format/title-case";

interface Campaign {
  id: string;
  name: string;
  status: string;
}

interface ClientCardProps {
  client: {
    id: string;
    slug: string;
    name: string;
    industry: string;
    colour: string;
    bgColour: string;
    initials: string;
    logo?: string | null;
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
      href={`/clients/${client.slug}`}
      className="block rounded-xl transition-all overflow-hidden"
      style={{
        backgroundColor: "var(--card-bg)",
        boxShadow: "0 1px 2px rgba(15, 23, 42, 0.04)",
        textDecoration: "none",
        color: "inherit",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.boxShadow = "0 4px 12px rgba(15, 23, 42, 0.08)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.boxShadow = "0 1px 2px rgba(15, 23, 42, 0.04)";
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
        {/* Logo or Initials Badge */}
        {client.logo ? (
          <img
            src={client.logo}
            alt={client.name}
            style={{
              height: 38,
              maxWidth: 96,
              width: "auto",
              borderRadius: 6,
              objectFit: "contain",
              flexShrink: 0,
            }}
          />
        ) : (
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
        )}

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
        className="grid grid-cols-3"
        style={{ backgroundColor: "var(--surface-container-low)" }}
      >
        {[
          { label: "Contacts", value: contactCount },
          { label: "Campaigns", value: client._count.campaigns },
          { label: "Coverage", value: 0 },
        ].map((stat) => (
          <div key={stat.label} className="px-3 py-3 text-center">
            <div
              className="text-lg font-extrabold tracking-tight"
              style={{ color: "var(--text-primary)" }}
            >
              {stat.value}
            </div>
            <div
              className="text-[9px] font-bold uppercase tracking-[0.12em] mt-0.5"
              style={{ color: "var(--text-muted-custom)" }}
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
                {titleCase(campaign.status)}
              </Badge>
            </div>
          ))}
        </div>
      )}
    </Link>
  );
}
