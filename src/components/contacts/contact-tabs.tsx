"use client";

import { useState } from "react";
import { Badge, type BadgeVariant } from "@/components/ui/badge";

interface ContactTabsProps {
  interactions: { id: string; type: string; date: Date | string; summary: string | null }[];
  outreaches: { id: string; subject: string; status: string; createdAt: Date | string }[];
  coverages: { id: string; publication: string; date: Date | string; type: string; mediaValue: any }[];
  notes: string | null;
}

const tabs = ["Timeline", "Pitches", "Coverage", "Notes"] as const;
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

      {/* Pitches */}
      {activeTab === "Pitches" && (
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
              No pitches yet
            </div>
          ) : (
            outreaches.map((outreach) => (
              <div
                key={outreach.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "8px 0",
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
                  {outreach.status}
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
              </div>
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
            coverages.map((coverage) => (
              <div
                key={coverage.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "8px 0",
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
                  {coverage.publication}
                </div>
                <Badge variant="default">{coverage.type}</Badge>
                <div
                  style={{
                    fontSize: 12,
                    color: "var(--text-sub)",
                    flexShrink: 0,
                  }}
                >
                  {formatCurrency(coverage.mediaValue)}
                </div>
                <div
                  style={{
                    fontSize: 12,
                    color: "var(--text-muted-custom)",
                    flexShrink: 0,
                  }}
                >
                  {formatDate(coverage.date)}
                </div>
              </div>
            ))
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
