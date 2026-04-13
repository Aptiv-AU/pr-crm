"use client";

import { useState } from "react";
import { Avatar } from "@/components/ui/avatar";
import { Badge, type BadgeVariant } from "@/components/ui/badge";
import { Icon } from "@/components/ui/icon";
import { CampaignCard } from "@/components/workspaces/campaign-card";

interface Contact {
  id: string;
  name: string;
  initials: string;
  avatarBg: string;
  avatarFg: string;
  publication: string;
  beat: string;
  tier: string;
  health: string;
}

interface CampaignContact {
  id: string;
  contact: Contact;
}

interface Campaign {
  id: string;
  name: string;
  type: string;
  status: string;
  dueDate: Date | null;
  campaignContacts: CampaignContact[];
  outreaches: { status: string }[];
  coverages: { id: string }[];
}

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
                <Avatar
                  initials={contact.initials}
                  bg={contact.avatarBg}
                  fg={contact.avatarFg}
                  size={30}
                />
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
                    {contact.publication}
                  </div>
                </div>
                <Badge variant={tierVariantMap[contact.tier] ?? "default"}>
                  {contact.tier}
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

      {activeTab === "Outreach" && (
        <div
          style={{
            textAlign: "center",
            padding: "40px 20px",
            color: "var(--text-muted-custom)",
            fontSize: 13,
          }}
        >
          Coming in Phase 5
        </div>
      )}

      {activeTab === "Coverage" && (
        <div
          style={{
            textAlign: "center",
            padding: "40px 20px",
            color: "var(--text-muted-custom)",
            fontSize: 13,
          }}
        >
          Coming in Phase 6
        </div>
      )}
    </div>
  );
}
