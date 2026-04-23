"use client";

import { useMemo } from "react";
import Link from "next/link";
import { Badge, type BadgeVariant } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { PageContainer, PageHeader } from "@/components/layout/page-header";

interface OutreachContact {
  id: string;
  name: string;
  initials: string;
  avatarBg: string;
  avatarFg: string;
  photo?: string | null;
  outlet: string;
  tier: string | null;
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

interface ColumnDef {
  key: "draft" | "sent" | "replied" | "declined";
  label: string;
  variant: BadgeVariant;
  statuses: string[];
}

const COLUMNS: ColumnDef[] = [
  { key: "draft", label: "Draft", variant: "draft", statuses: ["draft", "approved"] },
  { key: "sent", label: "Sent", variant: "outreach", statuses: ["sent"] },
  { key: "replied", label: "Replied", variant: "active", statuses: ["replied"] },
  { key: "declined", label: "Declined", variant: "cool", statuses: ["declined"] },
];

const TIER_VARIANT: Record<string, BadgeVariant> = {
  A: "tierA",
  B: "tierB",
  C: "tierC",
  D: "tierD",
};

function formatAge(iso: string): string {
  const then = new Date(iso).getTime();
  const diffMs = Date.now() - then;
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 60) return `${Math.max(mins, 1)}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks}w`;
  const months = Math.floor(days / 30);
  return `${months}mo`;
}

export function OutreachListClient({ outreaches, stats }: OutreachListClientProps) {
  const grouped = useMemo(() => {
    const map: Record<ColumnDef["key"], OutreachRow[]> = {
      draft: [],
      sent: [],
      replied: [],
      declined: [],
    };
    for (const o of outreaches) {
      for (const col of COLUMNS) {
        if (col.statuses.includes(o.status)) {
          map[col.key].push(o);
          break;
        }
      }
    }
    return map;
  }, [outreaches]);

  const active = stats.draft + stats.approved + stats.sent;
  const replyRate =
    stats.sent + stats.replied > 0
      ? Math.round((stats.replied / (stats.sent + stats.replied)) * 100)
      : null;

  const statItems: { label: string; value: string; sub?: string }[] = [
    { label: "Active", value: String(active), sub: "Draft + Sent" },
    { label: "Total pitches", value: String(stats.total) },
    { label: "Replied", value: String(stats.replied) },
  ];
  if (replyRate !== null) {
    statItems.splice(1, 0, { label: "Reply rate", value: `${replyRate}%`, sub: "Sent to reply" });
  }

  return (
    <PageContainer>
      <PageHeader
        eyebrow="Workspace"
        title="Outreach"
        subtitle="Every pitch, tracked from draft to reply."
        meta={[
          { label: "Active", value: String(active) },
          { label: "Replied", value: String(stats.replied) },
          ...(replyRate !== null
            ? [{ label: "Reply rate", value: `${replyRate}%` }]
            : []),
        ]}
        actions={
          <>
            <Button size="sm" variant="outline" icon="filter">
              All campaigns
            </Button>
            <Button size="sm" variant="primary" icon="plus">
              New pitch
            </Button>
          </>
        }
      />

      <div
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${statItems.length}, 1fr)`,
          gap: 16,
        }}
      >
        {statItems.map((it) => (
          <Card key={it.label} style={{ padding: "18px 20px" }}>
            <div
              style={{
                fontSize: 10,
                fontWeight: 800,
                textTransform: "uppercase",
                letterSpacing: "0.12em",
                color: "var(--text-muted-custom)",
              }}
            >
              {it.label}
            </div>
            <div
              style={{
                fontSize: 32,
                fontWeight: 800,
                letterSpacing: "-0.02em",
                marginTop: 10,
                lineHeight: 1.05,
              }}
            >
              {it.value}
            </div>
            {it.sub && (
              <div
                style={{
                  fontSize: 12,
                  color: "var(--text-sub)",
                  marginTop: 4,
                  fontWeight: 500,
                }}
              >
                {it.sub}
              </div>
            )}
          </Card>
        ))}
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 12,
          alignItems: "flex-start",
        }}
      >
        {COLUMNS.map((col) => {
          const items = grouped[col.key];
          return (
            <div
              key={col.key}
              style={{ display: "flex", flexDirection: "column", gap: 10 }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "4px 4px 0",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Badge variant={col.variant}>{col.label}</Badge>
                  <span
                    style={{
                      fontSize: 11,
                      color: "var(--text-muted-custom)",
                      fontFamily: "var(--font-mono)",
                      fontWeight: 600,
                    }}
                  >
                    {items.length}
                  </span>
                </div>
                <Icon name="plus" size={12} color="var(--text-muted-custom)" />
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {items.map((o) => {
                  const tierVariant = o.contact.tier
                    ? TIER_VARIANT[o.contact.tier.toUpperCase()]
                    : undefined;
                  return (
                    <Link
                      key={o.id}
                      href={`/campaigns/${o.campaign.slug}?tab=outreach`}
                      style={{ textDecoration: "none", color: "inherit" }}
                    >
                      <Card style={{ padding: 14 }}>
                        <div
                          style={{
                            fontSize: 13,
                            fontWeight: 700,
                            letterSpacing: "-0.005em",
                            lineHeight: 1.3,
                            marginBottom: 8,
                          }}
                        >
                          {o.subject}
                        </div>
                        <div
                          style={{
                            fontSize: 12,
                            color: "var(--text-sub)",
                            fontWeight: 500,
                            marginBottom: 10,
                          }}
                        >
                          {o.contact.name}
                          {o.contact.outlet && (
                            <span
                              style={{
                                fontStyle: "italic",
                                color: "var(--text-muted-custom)",
                              }}
                            >
                              {" "}
                              · {o.contact.outlet}
                            </span>
                          )}
                        </div>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                          }}
                        >
                          {tierVariant ? (
                            <Badge variant={tierVariant}>
                              {o.contact.tier!.toUpperCase()}-list
                            </Badge>
                          ) : (
                            <span />
                          )}
                          <span
                            style={{
                              fontSize: 10,
                              color: "var(--text-muted-custom)",
                              fontFamily: "var(--font-mono)",
                              fontWeight: 600,
                            }}
                          >
                            {formatAge(o.createdAt)}
                          </span>
                        </div>
                      </Card>
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </PageContainer>
  );
}
