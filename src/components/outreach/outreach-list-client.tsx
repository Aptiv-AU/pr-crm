"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { StatsBar } from "@/components/shared/stats-bar";
import { FilterPills } from "@/components/shared/filter-pills";
import { Badge, type BadgeVariant } from "@/components/ui/badge";
import { ClientBadge } from "@/components/shared/client-badge";
import { ContactAvatar } from "@/components/shared/contact-avatar";
import { EmptyState } from "@/components/shared/empty-state";
import { titleCase } from "@/lib/format/title-case";
import { PageContainer, PageHeader } from "@/components/layout/page-header";

interface OutreachContact {
  id: string;
  name: string;
  initials: string;
  avatarBg: string;
  avatarFg: string;
  photo?: string | null;
  outlet: string | null;
}

interface OutreachClient {
  id: string;
  name: string;
  initials: string;
  colour: string;
  bgColour: string;
  logo?: string | null;
}

interface OutreachCampaign {
  id: string;
  slug: string;
  name: string;
  client: OutreachClient;
}

interface OutreachRow {
  id: string;
  subject: string;
  status: string;
  createdAt: string;
  contact: OutreachContact;
  campaign: OutreachCampaign;
}

interface OutreachStats {
  total: number;
  draft: number;
  approved: number;
  sent: number;
  replied: number;
}

interface OutreachListClientProps {
  outreaches: OutreachRow[];
  stats: OutreachStats;
}

const STATUS_FILTERS = ["All", "Draft", "Approved", "Sent", "Replied"];

const STATUS_BADGE_VARIANT: Record<string, BadgeVariant> = {
  draft: "draft",
  approved: "outreach",
  sent: "active",
  replied: "warm",
};

export function OutreachListClient({ outreaches, stats }: OutreachListClientProps) {
  const [selectedStatus, setSelectedStatus] = useState("All");

  const filtered = useMemo(() => {
    if (selectedStatus === "All") return outreaches;
    return outreaches.filter((o) => o.status === selectedStatus.toLowerCase());
  }, [outreaches, selectedStatus]);

  return (
    <PageContainer>
      <PageHeader
        title="Outreach"
        subtitle="Pitches in motion, across every campaign."
      />

      <StatsBar
        stats={[
          { value: stats.total, label: "Total pitches" },
          { value: stats.draft, label: "Draft" },
          { value: stats.approved, label: "Approved" },
          { value: stats.sent, label: "Sent" },
        ]}
      />

      <FilterPills options={STATUS_FILTERS} selected={selectedStatus} onChange={setSelectedStatus} />

      {/* Outreach list */}
      {filtered.length === 0 ? (
        outreaches.length > 0 ? (
          <EmptyState icon="outreach" title="No pitches match this filter" description="Try selecting a different status." />
        ) : (
          <EmptyState icon="outreach" title="No pitches drafted yet" description="Create a campaign and generate AI pitches to get started." />
        )
      ) : (
        <div className="flex flex-col gap-[8px]">
          {filtered.map((outreach) => (
            <Link
              key={outreach.id}
              href={`/campaigns/${outreach.campaign.slug}?tab=outreach`}
              className="block rounded-xl p-4 transition-colors"
              style={{
                backgroundColor: "var(--card-bg)",
                boxShadow: "0 1px 2px rgba(15, 23, 42, 0.04)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "var(--surface-container-low)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "var(--card-bg)";
              }}
            >
              {/* Row 1: Contact info + status */}
              <div className="flex items-center gap-[8px]">
                <ContactAvatar contact={outreach.contact} size={28} />
                <span
                  className="text-[13px] font-medium truncate"
                  style={{ color: "var(--text-primary)" }}
                >
                  {outreach.contact.name}
                </span>
                {outreach.contact.outlet && (
                  <span
                    className="text-[12px] truncate shrink-0"
                    style={{ color: "var(--text-sub)" }}
                  >
                    {outreach.contact.outlet}
                  </span>
                )}
                <div className="ml-auto shrink-0">
                  <Badge variant={STATUS_BADGE_VARIANT[outreach.status] ?? "default"}>
                    {titleCase(outreach.status)}
                  </Badge>
                </div>
              </div>

              {/* Row 2: Campaign + subject */}
              <div className="flex items-center gap-[8px] mt-[6px]">
                <ClientBadge client={outreach.campaign.client} size={24} />
                <span
                  className="text-[12px] shrink-0"
                  style={{ color: "var(--text-sub)" }}
                >
                  {outreach.campaign.name}
                </span>
                <span
                  className="text-[13px] truncate"
                  style={{ color: "var(--text-primary)" }}
                >
                  {outreach.subject}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </PageContainer>
  );
}
