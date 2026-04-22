"use client";

import { useState } from "react";
import Link from "next/link";
import { Badge, type BadgeVariant } from "@/components/ui/badge";
import { titleCase } from "@/lib/format/title-case";

interface ContactTabsProps {
  interactions: { id: string; type: string; date: Date | string; summary: string | null }[];
  outreaches: { id: string; subject: string; status: string; createdAt: Date | string; campaignId: string }[];
  coverages: {
    id: string;
    publication: string;
    date: Date | string;
    type: string;
    mediaValue: any;
    url?: string | null;
    attachmentUrl?: string | null;
  }[];
  notes: string | null;
}

const tabs = ["Timeline", "Outreach", "Coverage", "Notes"] as const;
type Tab = (typeof tabs)[number];

const interactionTypeVariantMap: Record<string, BadgeVariant> = {
  email_sent: "accent",
  reply_received: "active",
  meeting: "default",
  call: "default",
  coverage: "outreach",
};

const outreachStatusVariantMap: Record<string, BadgeVariant> = {
  draft: "draft",
  approved: "accent",
  sent: "outreach",
  replied: "active",
};

function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function formatCurrency(value: any): string {
  if (value == null) return "\u2014";
  const num = typeof value === "string" ? parseFloat(value) : Number(value);
  if (isNaN(num)) return "\u2014";
  return `$${num.toLocaleString("en-US")}`;
}

export function ContactTabs({ interactions, outreaches, coverages, notes }: ContactTabsProps) {
  const [activeTab, setActiveTab] = useState<Tab>("Timeline");

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
              padding: "12px 20px",
              fontSize: 13,
              fontWeight: 700,
              color:
                activeTab === tab
                  ? "var(--accent-custom)"
                  : "var(--text-muted-custom)",
              backgroundColor: "transparent",
              border: "none",
              borderBottom:
                activeTab === tab
                  ? "3px solid var(--accent-custom)"
                  : "3px solid transparent",
              cursor: "pointer",
              marginBottom: -1,
              transition: "color 150ms ease, border-color 150ms ease",
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Timeline */}
      {activeTab === "Timeline" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {interactions.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                padding: "40px 20px",
                color: "var(--text-muted-custom)",
                fontSize: 13,
              }}
            >
              No interactions recorded yet
            </div>
          ) : (
            interactions.map((interaction) => (
              <div
                key={interaction.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "8px 0",
                }}
              >
                <div
                  style={{
                    fontSize: 12,
                    color: "var(--text-muted-custom)",
                    flexShrink: 0,
                    width: 90,
                  }}
                >
                  {formatDate(interaction.date)}
                </div>
                <Badge variant={interactionTypeVariantMap[interaction.type] ?? "default"}>
                  {interaction.type.replace(/_/g, " ")}
                </Badge>
                <div
                  style={{
                    fontSize: 13,
                    color: "var(--text-primary)",
                    flex: 1,
                    minWidth: 0,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {interaction.summary || "\u2014"}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Outreach */}
      {activeTab === "Outreach" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {outreaches.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                padding: "40px 20px",
                color: "var(--text-muted-custom)",
                fontSize: 13,
              }}
            >
              No outreach yet
            </div>
          ) : (
            outreaches.map((outreach) => (
              <Link
                key={outreach.id}
                href={`/campaigns/${outreach.campaignId}?tab=Outreach`}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "8px 10px",
                  margin: "0 -10px",
                  borderRadius: 6,
                  textDecoration: "none",
                  transition: "background-color 0.15s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = "var(--page-bg)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "transparent";
                }}
              >
                <div
                  style={{
                    fontSize: 13,
                    color: "var(--text-primary)",
                    flex: 1,
                    minWidth: 0,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {outreach.subject}
                </div>
                <Badge variant={outreachStatusVariantMap[outreach.status] ?? "default"}>
                  {titleCase(outreach.status)}
                </Badge>
                <div
                  style={{
                    fontSize: 12,
                    color: "var(--text-muted-custom)",
                    flexShrink: 0,
                  }}
                >
                  {formatDate(outreach.createdAt)}
                </div>
              </Link>
            ))
          )}
        </div>
      )}

      {/* Coverage */}
      {activeTab === "Coverage" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {coverages.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                padding: "40px 20px",
                color: "var(--text-muted-custom)",
                fontSize: 13,
              }}
            >
              No coverage yet
            </div>
          ) : (
            coverages.map((coverage) => {
              const typeLabel = coverage.type.charAt(0).toUpperCase() + coverage.type.slice(1);
              const typeBadgeVariant: Record<string, BadgeVariant> = {
                feature: "active",
                mention: "default",
                review: "accent",
                social: "outreach",
              };
              const hasImage = coverage.attachmentUrl && /\.(jpg|jpeg|png|gif|webp)(\?|$)/i.test(coverage.attachmentUrl);

              return (
                <div
                  key={coverage.id}
                  style={{
                    border: "1px solid var(--border-custom)",
                    borderRadius: 10,
                    backgroundColor: "var(--card-bg)",
                    overflow: "hidden",
                    display: "flex",
                    flexDirection: hasImage ? "row" : "column",
                  }}
                >
                  {/* Clipping image */}
                  {hasImage && (
                    <a
                      href={coverage.attachmentUrl!}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        width: 120,
                        minHeight: 90,
                        flexShrink: 0,
                        display: "block",
                        overflow: "hidden",
                        backgroundColor: "var(--page-bg)",
                      }}
                    >
                      <img
                        src={coverage.attachmentUrl!}
                        alt={`${coverage.publication} clipping`}
                        style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                      />
                    </a>
                  )}

                  {/* Content */}
                  <div style={{ flex: 1, padding: 12, display: "flex", flexDirection: "column", gap: 4 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {coverage.publication}
                      </span>
                      <Badge variant={typeBadgeVariant[coverage.type] ?? "default"}>
                        {typeLabel}
                      </Badge>
                      <span style={{ fontSize: 11, color: "var(--text-muted-custom)", whiteSpace: "nowrap", flexShrink: 0 }}>
                        {formatDate(coverage.date)}
                      </span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 2 }}>
                      {coverage.mediaValue != null && Number(coverage.mediaValue) > 0 && (
                        <span style={{ fontSize: 13, fontWeight: 600, color: "var(--green)" }}>
                          {formatCurrency(coverage.mediaValue)}
                        </span>
                      )}
                      {coverage.url && (
                        <a
                          href={coverage.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ fontSize: 11, color: "var(--accent-custom)", textDecoration: "none" }}
                        >
                          View article →
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Notes */}
      {activeTab === "Notes" && (
        <div>
          {notes ? (
            <div
              style={{
                fontSize: 13,
                color: "var(--text-primary)",
                whiteSpace: "pre-wrap",
                lineHeight: 1.6,
              }}
            >
              {notes}
            </div>
          ) : (
            <div
              style={{
                textAlign: "center",
                padding: "40px 20px",
                color: "var(--text-muted-custom)",
                fontSize: 13,
              }}
            >
              No notes
            </div>
          )}
        </div>
      )}
    </div>
  );
}
