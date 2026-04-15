"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { CampaignContactsTab } from "./campaign-contacts-tab";
import { CampaignSuppliersTab } from "./campaign-suppliers-tab";
import { CampaignBudget } from "./campaign-budget";
import { DraftPitchesPhase } from "./phase-draft-pitches";
import { OutreachPhase } from "./phase-outreach";
import { CampaignCoverageTab } from "./campaign-coverage-tab";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";

interface CampaignTabsProps {
  campaignContacts: {
    id: string;
    contactId: string;
    status: string;
    contact: {
      id: string;
      name: string;
      initials: string;
      avatarBg: string;
      avatarFg: string;
      publication: string | null;
      tier: string | null;
      health: string | null;
    };
  }[];
  campaignId: string;
  campaignType: string;
  availableContacts: {
    id: string;
    name: string;
    initials: string;
    avatarBg: string;
    avatarFg: string;
    publication: string | null;
  }[];
  campaignSuppliers: {
    id: string;
    supplierId: string;
    role: string | null;
    agreedCost: number | null;
    status: string;
    supplier: {
      id: string;
      name: string;
      serviceCategory: string | null;
    };
  }[];
  availableSuppliers: {
    id: string;
    name: string;
    serviceCategory: string | null;
  }[];
  budgetLineItems: {
    id: string;
    description: string;
    amount: number;
    confirmed: boolean;
    supplier: { id: string; name: string } | null;
  }[];
  totalBudget: number | null;
  campaign?: {
    id: string;
    brief: string | null;
    client: {
      id: string;
      name: string;
      industry: string | null;
      initials: string;
      colour: string;
      bgColour: string;
    };
  };
  outreaches?: {
    id: string;
    subject: string;
    body: string;
    status: string;
    generatedByAI: boolean;
    contactId: string;
    sentAt: string | null;
    followUpNumber: number;
    contact: {
      id: string;
      name: string;
      initials: string;
      avatarBg: string;
      avatarFg: string;
      email: string | null;
      publication: string | null;
    };
  }[];
  coverages?: {
    id: string;
    publication: string;
    date: string;
    type: string;
    url: string | null;
    mediaValue: number | null;
    attachmentUrl: string | null;
    notes: string | null;
    campaignId: string | null;
    contactId: string | null;
    contact: { id: string; name: string } | null;
  }[];
  campaignName?: string;
  emailConnected?: boolean;
  eventDetail?: {
    id: string;
    venue: string | null;
    eventDate: string | null;
    eventTime: string | null;
    guestCount: number | null;
    runsheetEntries: {
      id: string;
      time: string;
      activity: string;
      order: number;
    }[];
  } | null;
}

const baseTabs = ["Outreach", "Contacts", "Suppliers", "Budget", "Coverage"] as const;
type Tab = (typeof baseTabs)[number] | "Event";

export function CampaignTabs({
  campaignContacts,
  campaignId,
  campaignType,
  availableContacts,
  campaignSuppliers,
  availableSuppliers,
  budgetLineItems,
  totalBudget,
  campaign,
  outreaches,
  coverages,
  campaignName,
  emailConnected,
  eventDetail,
}: CampaignTabsProps) {
  const tabs: Tab[] = campaignType === "event"
    ? ["Outreach", "Contacts", "Suppliers", "Budget", "Coverage", "Event"]
    : ["Outreach", "Contacts", "Suppliers", "Budget", "Coverage"];
  const searchParams = useSearchParams();
  const initialTab = searchParams.get("tab");
  const validInitialTab = (tabs as readonly string[]).includes(initialTab ?? "") ? (initialTab as Tab) : tabs[0];
  const [activeTab, setActiveTab] = useState<Tab>(validInitialTab);

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
      {activeTab === "Outreach" && campaign && (
        <div className="flex flex-col gap-[16px]">
          <DraftPitchesPhase
            campaign={campaign}
            campaignContacts={campaignContacts}
            availableContacts={availableContacts}
            outreaches={outreaches ?? []}
          />
          <div
            style={{
              borderTop: "1px solid var(--border-custom)",
              margin: "8px 0",
            }}
          />
          <OutreachPhase
            campaignId={campaignId}
            outreaches={outreaches ?? []}
            emailConnected={emailConnected ?? false}
          />
        </div>
      )}

      {activeTab === "Contacts" && (
        <CampaignContactsTab
          campaignContacts={campaignContacts}
          campaignId={campaignId}
          availableContacts={availableContacts}
        />
      )}

      {activeTab === "Suppliers" && (
        <CampaignSuppliersTab
          campaignSuppliers={campaignSuppliers}
          campaignId={campaignId}
          availableSuppliers={availableSuppliers}
        />
      )}

      {activeTab === "Budget" && (
        <CampaignBudget
          lineItems={budgetLineItems}
          campaignId={campaignId}
          totalBudget={totalBudget}
        />
      )}

      {activeTab === "Coverage" && (
        <CampaignCoverageTab
          campaignId={campaignId}
          campaignName={campaignName ?? ""}
          coverages={coverages ?? []}
          contacts={campaignContacts.map((cc) => ({
            id: cc.contact.id,
            name: cc.contact.name,
          }))}
        />
      )}

      {activeTab === "Event" && (
        <div>
          {eventDetail ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {/* Compact summary */}
              <div
                style={{
                  padding: 14,
                  borderRadius: 8,
                  border: "1px solid var(--border-custom)",
                  backgroundColor: "var(--page-bg)",
                  display: "flex",
                  flexDirection: "column",
                  gap: 6,
                }}
              >
                <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
                  {eventDetail.venue && (
                    <div>
                      <div style={{ fontSize: 11, color: "var(--text-muted-custom)" }}>Venue</div>
                      <div style={{ fontSize: 13, color: "var(--text-primary)", fontWeight: 500 }}>
                        {eventDetail.venue}
                      </div>
                    </div>
                  )}
                  {eventDetail.eventDate && (
                    <div>
                      <div style={{ fontSize: 11, color: "var(--text-muted-custom)" }}>Date</div>
                      <div style={{ fontSize: 13, color: "var(--text-primary)", fontWeight: 500 }}>
                        {new Date(eventDetail.eventDate).toLocaleDateString("en-GB", {
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                        })}
                      </div>
                    </div>
                  )}
                  {eventDetail.eventTime && (
                    <div>
                      <div style={{ fontSize: 11, color: "var(--text-muted-custom)" }}>Time</div>
                      <div style={{ fontSize: 13, color: "var(--text-primary)", fontWeight: 500 }}>
                        {eventDetail.eventTime}
                      </div>
                    </div>
                  )}
                  {eventDetail.guestCount != null && (
                    <div>
                      <div style={{ fontSize: 11, color: "var(--text-muted-custom)" }}>Guests</div>
                      <div style={{ fontSize: 13, color: "var(--text-primary)", fontWeight: 500 }}>
                        {eventDetail.guestCount}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Mini runsheet preview */}
              {eventDetail.runsheetEntries.length > 0 && (
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-sub)", marginBottom: 6 }}>
                    Runsheet Preview
                  </div>
                  {eventDetail.runsheetEntries.slice(0, 5).map((entry) => (
                    <div
                      key={entry.id}
                      style={{
                        display: "flex",
                        gap: 8,
                        padding: "4px 0",
                        borderBottom: "1px solid var(--border-custom)",
                      }}
                    >
                      <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-primary)", minWidth: 44 }}>
                        {entry.time}
                      </span>
                      <span style={{ fontSize: 12, color: "var(--text-sub)" }}>{entry.activity}</span>
                    </div>
                  ))}
                  {eventDetail.runsheetEntries.length > 5 && (
                    <div style={{ fontSize: 11, color: "var(--text-muted-custom)", marginTop: 4 }}>
                      +{eventDetail.runsheetEntries.length - 5} more entries
                    </div>
                  )}
                </div>
              )}

              {/* Link to full event page */}
              <Link
                href={`/events/${campaignId}`}
                style={{
                  fontSize: 13,
                  fontWeight: 500,
                  color: "var(--accent-custom)",
                  textDecoration: "none",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                View full event details →
              </Link>
            </div>
          ) : (
            <div style={{ textAlign: "center", padding: "30px 20px" }}>
              <div style={{ fontSize: 13, color: "var(--text-muted-custom)", marginBottom: 8 }}>
                No event details configured yet.
              </div>
              <Link
                href={`/events/${campaignId}`}
                style={{
                  fontSize: 13,
                  fontWeight: 500,
                  color: "var(--accent-custom)",
                  textDecoration: "none",
                }}
              >
                Set up event details →
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
