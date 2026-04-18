"use client";

import { useState } from "react";
import Link from "next/link";
import { Badge, type BadgeVariant } from "@/components/ui/badge";
import { Icon } from "@/components/ui/icon";
import { CampaignCard } from "@/components/workspaces/campaign-card";
import { ContactAvatar } from "@/components/shared/contact-avatar";

interface Contact {
  id: string;
  name: string;
  initials: string;
  avatarBg: string;
  avatarFg: string;
  photo?: string | null;
  outlet: string | null;
  beat: string | null;
  tier: string | null;
  health: string;
}

interface CampaignContact {
  id: string;
  contact: Contact;
}

interface WorkspaceOutreach {
  id: string;
  subject: string;
  status: string;
  createdAt: Date;
  contact: {
    id: string;
    name: string;
    initials: string;
    avatarBg: string;
    avatarFg: string;
    photo: string | null;
    outlet: string | null;
  };
}

interface Campaign {
  id: string;
  slug: string;
  name: string;
  type: string;
  status: string;
  dueDate: Date | null;
  campaignContacts: CampaignContact[];
  outreaches: WorkspaceOutreach[];
  coverages: { id: string }[];
}

const STATUS_BADGE_VARIANT: Record<string, BadgeVariant> = {
  draft: "draft",
  approved: "outreach",
  sent: "active",
  replied: "warm",
};

interface WorkspaceTabsProps {
  campaigns: Campaign[];
}

const tabs = ["Campaigns", "Contacts", "Outreach", "Coverage"] as const;
type Tab = (typeof tabs)[number];

const tierVariantMap: Record<string, BadgeVariant> = {
  "tier-1": "accent",
  "tier-2": "outreach",
  "tier-3": "default",
};

const healthVariantMap: Record<string, BadgeVariant> = {
  warm: "warm",
  cool: "cool",
  hot: "active",
};

export function WorkspaceTabs({ campaigns }: WorkspaceTabsProps) {
  const [activeTab, setActiveTab] = useState<Tab>("Campaigns");

  // Deduplicate contacts across all campaigns
  const contactMap = new Map<string, Contact>();
  for (const campaign of campaigns) {
    for (const cc of campaign.campaignContacts) {
      if (!contactMap.has(cc.contact.id)) {
        contactMap.set(cc.contact.id, cc.contact);
      }
    }
  }
  const contacts = Array.from(contactMap.values());

  return (
    <div>
      {/* Tab bar */}
      <div
        style={{
          display: "flex",
          gap: 0,
          borderBottom: "1px solid var(--border-custom)",
          marginBottom: 16,
        }}
      >
        {tabs.map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            style={{
              padding: "8px 16px",
              fontSize: 13,
              fontWeight: 500,
              color:
                activeTab === tab
                  ? "var(--accent-custom)"
                  : "var(--text-muted-custom)",
              backgroundColor: "transparent",
              border: "none",
              borderBottom:
                activeTab === tab
                  ? "2px solid var(--accent-custom)"
                  : "2px solid transparent",
              cursor: "pointer",
              marginBottom: -1,
              transition: "color 150ms ease, border-color 150ms ease",
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === "Campaigns" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {campaigns.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                padding: "40px 20px",
                color: "var(--text-muted-custom)",
                fontSize: 13,
              }}
            >
              No campaigns yet
            </div>
          ) : (
            campaigns.map((campaign) => (
              <CampaignCard key={campaign.id} campaign={campaign} />
            ))
          )}
        </div>
      )}

      {activeTab === "Contacts" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
          {contacts.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                padding: "40px 20px",
                color: "var(--text-muted-custom)",
                fontSize: 13,
              }}
            >
              No contacts yet
            </div>
          ) : (
            contacts.map((contact) => (
              <div
                key={contact.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "10px 12px",
                  borderRadius: 8,
                  transition: "background-color 150ms ease",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.backgroundColor =
                    "var(--hover-bg)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.backgroundColor =
                    "transparent";
                }}
              >
                <ContactAvatar contact={contact} size={30} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: "var(--text-primary)",
                      lineHeight: 1.3,
                    }}
                  >
                    {contact.name}
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      color: "var(--text-muted-custom)",
                      lineHeight: 1.3,
                    }}
                  >
                    {contact.outlet}
                  </div>
                </div>
                <Badge variant={tierVariantMap[contact.tier ?? ""] ?? "default"}>
                  {contact.tier ?? "—"}
                </Badge>
                <Badge variant={healthVariantMap[contact.health] ?? "default"}>
                  {contact.health}
                </Badge>
                <Icon name="chevronR" size={14} color="var(--text-muted-custom)" />
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === "Outreach" && (() => {
        const rows = campaigns.flatMap((c) =>
          c.outreaches.map((o) => ({ ...o, campaign: { id: c.id, slug: c.slug, name: c.name } })),
        ).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

        if (rows.length === 0) {
          return (
            <div
              style={{
                textAlign: "center",
                padding: "40px 20px",
                color: "var(--text-muted-custom)",
                fontSize: 13,
              }}
            >
              No outreach yet. View and send outreach in each campaign's Outreach tab.
            </div>
          );
        }
        return (
          <div className="flex flex-col gap-[8px]">
            {rows.map((o) => (
              <Link
                key={o.id}
                href={`/campaigns/${o.campaign.slug}?tab=outreach`}
                className="block rounded-[10px] p-3 transition-colors"
                style={{
                  border: "1px solid var(--border-custom)",
                  backgroundColor: "var(--card-bg)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "var(--border-mid)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "var(--border-custom)";
                }}
              >
                <div className="flex items-center gap-[8px]">
                  <ContactAvatar contact={o.contact} size={28} />
                  <span className="text-[13px] font-medium truncate" style={{ color: "var(--text-primary)" }}>
                    {o.contact.name}
                  </span>
                  {o.contact.outlet && (
                    <span className="text-[12px] truncate shrink-0" style={{ color: "var(--text-sub)" }}>
                      {o.contact.outlet}
                    </span>
                  )}
                  <div className="ml-auto shrink-0">
                    <Badge variant={STATUS_BADGE_VARIANT[o.status] ?? "default"}>{o.status}</Badge>
                  </div>
                </div>
                <div className="flex items-center gap-[8px] mt-[6px]">
                  <span className="text-[12px] shrink-0" style={{ color: "var(--text-sub)" }}>
                    {o.campaign.name}
                  </span>
                  <span className="text-[13px] truncate" style={{ color: "var(--text-primary)" }}>
                    {o.subject}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        );
      })()}

      {activeTab === "Coverage" && (() => {
        const totalCoverages = campaigns.reduce((sum, c) => sum + c.coverages.length, 0);
        if (totalCoverages === 0) {
          return (
            <div
              style={{
                textAlign: "center",
                padding: "40px 20px",
                color: "var(--text-muted-custom)",
                fontSize: 13,
              }}
            >
              No coverage yet. Log coverage in each campaign's Coverage tab.
            </div>
          );
        }
        return (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div>
              <div style={{ fontSize: 11, color: "var(--text-muted-custom)" }}>Total Coverage Entries</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: "var(--text-primary)" }}>{totalCoverages}</div>
            </div>
            <div style={{ fontSize: 13, color: "var(--text-muted-custom)" }}>
              View and log coverage in each campaign's Coverage tab.
            </div>
          </div>
        );
      })()}
    </div>
  );
}
