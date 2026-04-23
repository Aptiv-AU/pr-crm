"use client";

import { useState, type CSSProperties } from "react";
import { Badge, type BadgeVariant } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { titleCase } from "@/lib/format/title-case";

const TEAL = "#006C49";

interface ContactTabsProps {
  contact: {
    name: string;
    email: string | null;
    phone: string | null;
    instagram: string | null;
    twitter: string | null;
    linkedin: string | null;
    notes: string | null;
  };
  stats: {
    coverageCount: number;
    replyRate: number;
    campaignCount: number;
  };
  outreaches: {
    id: string;
    subject: string;
    status: string;
    createdAt: Date | string;
    campaignId: string;
    campaignName?: string | null;
  }[];
  coverages: {
    id: string;
    publication: string;
    date: Date | string;
    type: string;
    mediaValue: unknown;
    headline?: string | null;
    reach?: number | null;
  }[];
  lastContact?: string | null;
}

const tabs = ["Overview", "Outreach", "Coverage", "Notes"] as const;
type Tab = (typeof tabs)[number];

const outreachStatusVariantMap: Record<string, BadgeVariant> = {
  draft: "draft",
  approved: "accent",
  sent: "outreach",
  replied: "active",
  declined: "cool",
};

function MicroLabel({ children, style }: { children: React.ReactNode; style?: CSSProperties }) {
  return (
    <div
      style={{
        fontSize: 10,
        fontWeight: 800,
        textTransform: "uppercase",
        letterSpacing: "0.12em",
        color: "var(--text-muted-custom)",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

function StatCard({ label, value, sub }: { label: string; value: React.ReactNode; sub?: string }) {
  return (
    <Card style={{ padding: "18px 20px" }}>
      <MicroLabel>{label}</MicroLabel>
      <div
        style={{
          fontSize: 32,
          fontWeight: 800,
          letterSpacing: "-0.02em",
          marginTop: 10,
          lineHeight: 1.05,
          color: "var(--text-primary)",
        }}
      >
        {value}
      </div>
      {sub && (
        <div style={{ fontSize: 12, color: "var(--text-sub)", marginTop: 4, fontWeight: 500 }}>
          {sub}
        </div>
      )}
    </Card>
  );
}

function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function relativeTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${Math.max(1, mins)}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks}w`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo`;
  const years = Math.floor(days / 365);
  return `${years}y`;
}

function formatReach(n: number | null | undefined): string {
  if (n == null) return "—";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}k`;
  return String(n);
}

export function ContactTabs({
  contact,
  stats,
  outreaches,
  coverages,
  lastContact,
}: ContactTabsProps) {
  const [activeTab, setActiveTab] = useState<Tab>("Overview");

  const channelRows: { label: string; value: string }[] = [];
  if (contact.email) channelRows.push({ label: "Email", value: contact.email });
  if (contact.phone) channelRows.push({ label: "Desk phone", value: contact.phone });
  if (contact.twitter) channelRows.push({ label: "X / Twitter", value: contact.twitter });
  if (contact.linkedin) channelRows.push({ label: "LinkedIn", value: contact.linkedin });
  if (contact.instagram) channelRows.push({ label: "Instagram", value: contact.instagram });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
      {/* Tab bar */}
      <div
        style={{
          display: "flex",
          gap: 24,
          borderBottom: "1px solid var(--border-custom)",
          fontSize: 12,
        }}
      >
        {tabs.map((t) => {
          const on = activeTab === t;
          return (
            <button
              key={t}
              type="button"
              onClick={() => setActiveTab(t)}
              style={{
                padding: "14px 0",
                fontWeight: 800,
                fontSize: 12,
                textTransform: "uppercase",
                letterSpacing: "0.12em",
                color: on ? "var(--text-primary)" : "var(--text-muted-custom)",
                borderBottom: on ? `2px solid ${TEAL}` : "2px solid transparent",
                background: "transparent",
                border: "none",
                borderTop: "none",
                borderLeft: "none",
                borderRight: "none",
                marginBottom: -1,
                cursor: "pointer",
              }}
            >
              {t}
            </button>
          );
        })}
      </div>

      {activeTab === "Overview" && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
            <StatCard label="Pitches sent" value={outreaches.length} sub="Last 12 months" />
            <StatCard label="Reply rate" value={`${stats.replyRate}%`} />
            <StatCard label="Placements" value={stats.coverageCount} />
            <StatCard label="Last contact" value={lastContact ?? "—"} />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <Card style={{ padding: 20 }}>
              <MicroLabel style={{ marginBottom: 12 }}>Pitch preferences</MicroLabel>
              <div style={{ fontSize: 12, color: "var(--text-muted-custom)", fontStyle: "italic", fontWeight: 500 }}>
                No preferences recorded
              </div>
            </Card>
            <Card style={{ padding: 20 }}>
              <MicroLabel style={{ marginBottom: 12 }}>Channels</MicroLabel>
              {channelRows.length === 0 ? (
                <div style={{ fontSize: 12, color: "var(--text-muted-custom)", fontStyle: "italic", fontWeight: 500 }}>
                  No channels on file
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {channelRows.map((r) => (
                    <div
                      key={r.label}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 12,
                      }}
                    >
                      <span style={{ fontSize: 12, color: "var(--text-sub)", fontWeight: 500 }}>
                        {r.label}
                      </span>
                      <span
                        style={{
                          fontSize: 12,
                          fontFamily: "var(--font-mono)",
                          fontWeight: 600,
                          color: "var(--text-primary)",
                          textAlign: "right",
                          wordBreak: "break-all",
                        }}
                      >
                        {r.value}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>

          <Card style={{ padding: 20 }}>
            <MicroLabel style={{ marginBottom: 12 }}>Notes</MicroLabel>
            {contact.notes ? (
              <div
                style={{
                  fontSize: 13,
                  color: "var(--text-primary)",
                  lineHeight: 1.55,
                  fontWeight: 500,
                  whiteSpace: "pre-wrap",
                }}
              >
                {contact.notes}
              </div>
            ) : (
              <div style={{ fontSize: 12, color: "var(--text-muted-custom)", fontStyle: "italic", fontWeight: 500 }}>
                No notes yet
              </div>
            )}
          </Card>
        </>
      )}

      {activeTab === "Outreach" && (
        <Card style={{ padding: 0 }}>
          <div
            style={{
              padding: "16px 20px",
              borderBottom: "1px solid var(--border-custom)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <MicroLabel>Pitch history</MicroLabel>
            <span style={{ fontSize: 11, color: "var(--text-muted-custom)", fontWeight: 600 }}>
              {outreaches.length} pitches · last 12 months
            </span>
          </div>
          {outreaches.length === 0 ? (
            <div style={{ padding: "40px 20px", textAlign: "center", color: "var(--text-muted-custom)", fontSize: 13 }}>
              No outreach yet
            </div>
          ) : (
            outreaches.map((r, i) => {
              const variant = outreachStatusVariantMap[r.status] ?? "default";
              return (
                <div
                  key={r.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: "14px 20px",
                    borderTop: i === 0 ? "none" : "1px solid var(--border-custom)",
                  }}
                >
                  <Icon name="mail" size={14} color={TEAL} />
                  <span style={{ fontSize: 13, fontWeight: 700, flex: 1, minWidth: 0, color: "var(--text-primary)" }}>
                    {r.subject}
                    {r.campaignName && (
                      <span style={{ fontStyle: "italic", color: "var(--text-sub)", fontWeight: 500 }}>
                        {" · for "}
                        {r.campaignName}
                      </span>
                    )}
                  </span>
                  <Badge variant={variant}>{titleCase(r.status)}</Badge>
                  <span
                    style={{
                      fontSize: 11,
                      color: "var(--text-muted-custom)",
                      width: 36,
                      textAlign: "right",
                      fontWeight: 600,
                      fontFamily: "var(--font-mono)",
                    }}
                  >
                    {relativeTime(r.createdAt)}
                  </span>
                </div>
              );
            })
          )}
        </Card>
      )}

      {activeTab === "Coverage" && (
        <Card style={{ padding: 0 }}>
          <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border-custom)" }}>
            <MicroLabel>Placements from {contact.name.split(" ")[0]}</MicroLabel>
          </div>
          {coverages.length === 0 ? (
            <div style={{ padding: "40px 20px", textAlign: "center", color: "var(--text-muted-custom)", fontSize: 13 }}>
              No coverage yet
            </div>
          ) : (
            coverages.map((it, i) => (
              <div
                key={it.id}
                style={{
                  display: "flex",
                  gap: 16,
                  padding: "16px 20px",
                  borderTop: i === 0 ? "none" : "1px solid var(--border-custom)",
                  alignItems: "flex-start",
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 10,
                      fontWeight: 800,
                      textTransform: "uppercase",
                      letterSpacing: "0.14em",
                      color: TEAL,
                      marginBottom: 4,
                    }}
                  >
                    {it.publication}
                  </div>
                  <div
                    style={{
                      fontSize: 14,
                      fontWeight: 700,
                      letterSpacing: "-0.005em",
                      lineHeight: 1.3,
                      color: "var(--text-primary)",
                    }}
                  >
                    {it.headline ?? titleCase(it.type)}
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      color: "var(--text-muted-custom)",
                      marginTop: 4,
                      fontWeight: 500,
                      fontFamily: "var(--font-mono)",
                    }}
                  >
                    {formatDate(it.date)}
                  </div>
                </div>
                {it.reach != null && (
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <MicroLabel>Reach</MicroLabel>
                    <div style={{ fontSize: 15, fontWeight: 800, marginTop: 4, color: "var(--text-primary)" }}>
                      {formatReach(it.reach)}
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </Card>
      )}

      {activeTab === "Notes" && (
        <Card style={{ padding: 20 }}>
          <MicroLabel style={{ marginBottom: 12 }}>Working notes</MicroLabel>
          {contact.notes ? (
            <div style={{ fontSize: 13, lineHeight: 1.6, fontWeight: 500, color: "var(--text-primary)" }}>
              <p style={{ marginTop: 0, whiteSpace: "pre-wrap" }}>{contact.notes}</p>
            </div>
          ) : (
            <div style={{ fontSize: 12, color: "var(--text-muted-custom)", fontStyle: "italic", fontWeight: 500 }}>
              No notes yet
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
