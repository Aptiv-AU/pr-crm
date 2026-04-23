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
import { Badge, type BadgeVariant } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { StatCard } from "@/components/dashboard/stat-card";

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
      outlet: string | null;
      tier: string | null;
      health: string | null;
    };
  }[];
  campaignId: string;
  campaignSlug: string;
  campaignType: string;
  availableContacts: {
    id: string;
    name: string;
    initials: string;
    avatarBg: string;
    avatarFg: string;
    outlet: string | null;
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
      outlet: string | null;
    };
    replies: {
      id: string;
      fromEmail: string;
      fromName: string | null;
      receivedAt: string;
      subject: string | null;
      bodyText: string;
    }[];
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
  suppressedEmails?: string[];
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

const baseTabs = ["Overview", "Outreach", "Contacts", "Suppliers", "Budget", "Coverage"] as const;
type Tab = (typeof baseTabs)[number] | "Event";

const TEAL = "#006C49";

const outreachStatusVariant: Record<string, BadgeVariant> = {
  draft: "draft",
  scheduled: "outreach",
  sent: "outreach",
  replied: "active",
  bounced: "coral",
  failed: "coral",
};

function formatRelativeTime(iso: string | null): string {
  if (!iso) return "—";
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 60_000) return "now";
  const mins = Math.floor(ms / 60_000);
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d`;
  const weeks = Math.floor(days / 7);
  return `${weeks}w`;
}

export function CampaignTabs({
  campaignContacts,
  campaignId,
  campaignSlug,
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
  suppressedEmails,
  eventDetail,
}: CampaignTabsProps) {
  const tabs: Tab[] = campaignType === "event"
    ? ["Overview", "Outreach", "Contacts", "Suppliers", "Budget", "Coverage", "Event"]
    : ["Overview", "Outreach", "Contacts", "Suppliers", "Budget", "Coverage"];
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
          gap: 24,
          borderBottom: "1px solid var(--border-custom)",
          marginBottom: 20,
          fontSize: 12,
        }}
      >
        {tabs.map((tab) => {
          const isActive = activeTab === tab;
          return (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              style={{
                padding: "14px 0",
                fontSize: 12,
                fontWeight: 800,
                textTransform: "uppercase",
                letterSpacing: "0.12em",
                color: isActive ? "var(--text-primary)" : "var(--text-muted-custom)",
                backgroundColor: "transparent",
                border: "none",
                borderBottom: isActive ? `2px solid ${TEAL}` : "2px solid transparent",
                cursor: "pointer",
                marginBottom: -1,
                transition: "color 150ms ease, border-color 150ms ease",
              }}
            >
              {tab}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      {activeTab === "Overview" && (() => {
        const all = outreaches ?? [];
        const drafted = all.filter((o) => o.status === "draft").length;
        const sent = all.filter((o) => o.status === "sent" || o.status === "replied").length;
        const replied = all.filter((o) => o.status === "replied").length;
        const coverageCount = (coverages ?? []).length;
        const replyRate = sent > 0 ? Math.round((replied / sent) * 100) : null;
        const recent = [...all]
          .sort((a, b) => {
            const ta = a.sentAt ? new Date(a.sentAt).getTime() : 0;
            const tb = b.sentAt ? new Date(b.sentAt).getTime() : 0;
            return tb - ta;
          })
          .slice(0, 5);
        return (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
                gap: 12,
              }}
            >
              <StatCard label="Drafted" value={drafted} />
              <StatCard label="Sent" value={sent} />
              <StatCard
                label="Replies"
                value={replied}
                sublabel={replyRate != null ? `${replyRate}% reply rate` : undefined}
              />
              <StatCard label="Coverage" value={coverageCount} />
            </div>

            <Card style={{ padding: 20 }}>
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 800,
                  textTransform: "uppercase",
                  letterSpacing: "0.12em",
                  color: "var(--text-muted-custom)",
                  marginBottom: 16,
                }}
              >
                Recent outreach
              </div>
              {recent.length === 0 ? (
                <div
                  style={{
                    fontSize: 13,
                    color: "var(--text-muted-custom)",
                    fontWeight: 500,
                  }}
                >
                  No outreach yet.
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                  {recent.map((o, i) => {
                    const statusLabel =
                      o.status === "replied"
                        ? "Replied"
                        : o.status === "sent"
                          ? "Sent"
                          : o.status === "draft"
                            ? "Draft"
                            : o.status.charAt(0).toUpperCase() + o.status.slice(1);
                    return (
                      <div
                        key={o.id}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 12,
                          padding: "12px 0",
                          borderTop: i > 0 ? "1px solid var(--border-custom)" : "none",
                        }}
                      >
                        <Icon name="mail" size={14} color={TEAL} />
                        <span
                          style={{
                            fontSize: 13,
                            fontWeight: 600,
                            flex: 1,
                            minWidth: 0,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                            color: "var(--text-primary)",
                          }}
                        >
                          {o.contact.name}
                          {o.contact.outlet && (
                            <span
                              style={{
                                color: "var(--text-sub)",
                                fontWeight: 500,
                                fontStyle: "italic",
                              }}
                            >
                              {" "}
                              · {o.contact.outlet}
                            </span>
                          )}
                        </span>
                        <Badge variant={outreachStatusVariant[o.status] ?? "default"}>
                          {statusLabel}
                        </Badge>
                        <span
                          style={{
                            fontSize: 11,
                            color: "var(--text-muted-custom)",
                            minWidth: 34,
                            textAlign: "right",
                            fontWeight: 600,
                            fontFamily: "var(--font-mono)",
                          }}
                        >
                          {formatRelativeTime(o.sentAt)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>
          </div>
        );
      })()}

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
            suppressedEmails={suppressedEmails ?? []}
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
                href={`/events/${campaignSlug}`}
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
                href={`/events/${campaignSlug}`}
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
