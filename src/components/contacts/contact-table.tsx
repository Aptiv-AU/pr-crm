"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ContactAvatar } from "@/components/shared/contact-avatar";
import { Card } from "@/components/ui/card";
import { Badge, type BadgeVariant } from "@/components/ui/badge";
import { titleCase } from "@/lib/format/title-case";

interface ContactRow {
  id: string;
  slug: string;
  name: string;
  initials: string;
  avatarBg: string;
  avatarFg: string;
  photo?: string | null;
  outlet: string;
  beat: string;
  tier: string;
  health: string;
  createdAt: Date | string;
  lastContactDate?: string | null;
}

interface ContactTableProps {
  contacts: ContactRow[];
}

const TIER_VAR: Record<string, BadgeVariant> = {
  A: "tierA",
  B: "tierB",
  C: "tierC",
  D: "tierD",
};

const HEALTH_VAR: Record<string, BadgeVariant> = {
  warm: "warm",
  cool: "cool",
  cold: "cool",
  active: "active",
  contacted: "default",
  new: "default",
};

const headerCell: React.CSSProperties = {
  fontSize: 10,
  fontWeight: 800,
  color: "var(--text-muted-custom)",
  textTransform: "uppercase",
  letterSpacing: "0.12em",
  padding: "14px 16px",
  textAlign: "left",
  borderBottom: "1px solid var(--border-custom)",
};

const bodyCell: React.CSSProperties = {
  padding: "12px 16px",
  borderBottom: "1px solid var(--border-custom)",
  verticalAlign: "middle",
};

function formatLastContact(date?: string | null): string {
  if (!date) return "—";
  const d = new Date(date);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const day = 24 * 60 * 60 * 1000;
  const diffDays = Math.floor(diffMs / day);
  if (diffDays <= 0) return "today";
  if (diffDays === 1) return "1d ago";
  if (diffDays < 30) return `${diffDays}d ago`;
  const months = Math.floor(diffDays / 30);
  if (months < 12) return `${months}mo ago`;
  const years = Math.floor(months / 12);
  return `${years}y ago`;
}

export function ContactTable({ contacts }: ContactTableProps) {
  const router = useRouter();
  const [hover, setHover] = useState<string | null>(null);

  return (
    <Card style={{ padding: 0 }}>
      <div className="overflow-x-auto">
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={headerCell}>Name</th>
              <th style={headerCell}>Publication</th>
              <th style={headerCell}>Beat</th>
              <th style={headerCell}>Tier</th>
              <th style={headerCell}>Relationship</th>
              <th style={headerCell}>Last contact</th>
            </tr>
          </thead>
          <tbody>
            {contacts.map((c, i) => {
              const isLast = i === contacts.length - 1;
              const cellStyle: React.CSSProperties = {
                ...bodyCell,
                borderBottom: isLast ? "none" : bodyCell.borderBottom,
              };
              const tierKey = (c.tier || "").toUpperCase();
              const tierVariant = TIER_VAR[tierKey];
              const healthKey = (c.health || "").toLowerCase();
              const healthVariant = HEALTH_VAR[healthKey] ?? "default";
              return (
                <tr
                  key={c.id}
                  onMouseEnter={() => setHover(c.id)}
                  onMouseLeave={() => setHover(null)}
                  onClick={() => router.push(`/contacts/${c.slug}`)}
                  style={{
                    background: hover === c.id ? "var(--hover-bg)" : "transparent",
                    cursor: "pointer",
                  }}
                >
                  <td style={cellStyle}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <ContactAvatar contact={c} size={30} />
                      <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)" }}>
                        {c.name}
                      </span>
                    </div>
                  </td>
                  <td style={cellStyle}>
                    <span style={{ fontSize: 12, color: "var(--text-sub)", fontWeight: 500 }}>
                      {c.outlet || "—"}
                    </span>
                  </td>
                  <td style={cellStyle}>
                    {c.beat ? <Badge>{c.beat}</Badge> : <span style={{ color: "var(--text-muted-custom)", fontSize: 12 }}>—</span>}
                  </td>
                  <td style={cellStyle}>
                    {tierVariant ? (
                      <Badge variant={tierVariant}>{tierKey}-list</Badge>
                    ) : (
                      <span style={{ color: "var(--text-muted-custom)", fontSize: 12 }}>—</span>
                    )}
                  </td>
                  <td style={cellStyle}>
                    <Badge variant={healthVariant}>{titleCase(c.health || "—")}</Badge>
                  </td>
                  <td style={cellStyle}>
                    <span
                      style={{
                        fontSize: 11,
                        color: "var(--text-muted-custom)",
                        fontWeight: 600,
                        fontFamily: "var(--font-mono)",
                      }}
                    >
                      {formatLastContact(c.lastContactDate)}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
