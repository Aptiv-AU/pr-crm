"use client";

import Link from "next/link";
import { ContactAvatar } from "@/components/shared/contact-avatar";
import { Badge } from "@/components/ui/badge";
import { Icon } from "@/components/ui/icon";
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

function relativeTime(date: Date | string): string {
  const now = new Date();
  const d = new Date(date);
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return "today";
  if (diffDays === 1) return "1d";
  if (diffDays < 7) return `${diffDays}d`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)}mo`;
  return `${Math.floor(diffDays / 365)}y`;
}

function TierBadge({ tier }: { tier: string }) {
  const variant = tier === "A" ? "solid" : "default";
  return <Badge variant={variant}>{tier}-list</Badge>;
}

function HealthBadge({ health }: { health: string }) {
  if (health === "warm") return <Badge variant="warm">Warm</Badge>;
  if (health === "cool") return <Badge variant="cool">Cool</Badge>;
  return <Badge variant="default">{titleCase(health)}</Badge>;
}

const headerStyle = {
  fontSize: 11,
  fontWeight: 500 as const,
  color: "var(--text-muted-custom)",
  textTransform: "uppercase" as const,
  letterSpacing: "0.06em",
  padding: "8px 12px",
  textAlign: "left" as const,
  borderBottom: "1px solid var(--border-custom)",
};

const cellStyle = {
  padding: "10px 12px",
  borderBottom: "1px solid var(--border-custom)",
  verticalAlign: "middle" as const,
};

export function ContactTable({ contacts }: ContactTableProps) {
  return (
    <table style={{ width: "100%", borderCollapse: "collapse" as const }}>
      <thead>
        <tr>
          <th style={headerStyle}>Name</th>
          <th style={headerStyle}>Publication</th>
          <th style={headerStyle}>Beat</th>
          <th style={headerStyle}>Tier</th>
          <th style={headerStyle}>Relationship</th>
          <th style={headerStyle}>Last contact</th>
          <th style={{ ...headerStyle, width: 32 }} />
        </tr>
      </thead>
      <tbody>
        {contacts.map((contact) => (
          <tr
            key={contact.id}
            style={{ cursor: "pointer" }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.backgroundColor = "var(--hover-bg)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.backgroundColor = "";
            }}
          >
            <td style={cellStyle}>
              <Link
                href={`/contacts/${contact.slug}`}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  textDecoration: "none",
                  color: "inherit",
                }}
              >
                <ContactAvatar contact={contact} size={30} />
                <span style={{ fontSize: 13, fontWeight: 500, color: "var(--text-primary)" }}>
                  {contact.name}
                </span>
              </Link>
            </td>
            <td style={cellStyle}>
              <Link href={`/contacts/${contact.slug}`} style={{ textDecoration: "none", color: "inherit" }}>
                <span style={{ fontSize: 12, color: "var(--text-sub)" }}>{contact.outlet}</span>
              </Link>
            </td>
            <td style={cellStyle}>
              <Link href={`/contacts/${contact.slug}`} style={{ textDecoration: "none", color: "inherit" }}>
                <Badge variant="default">{contact.beat}</Badge>
              </Link>
            </td>
            <td style={cellStyle}>
              <Link href={`/contacts/${contact.slug}`} style={{ textDecoration: "none", color: "inherit" }}>
                <TierBadge tier={contact.tier} />
              </Link>
            </td>
            <td style={cellStyle}>
              <Link href={`/contacts/${contact.slug}`} style={{ textDecoration: "none", color: "inherit" }}>
                <HealthBadge health={contact.health} />
              </Link>
            </td>
            <td style={cellStyle}>
              <Link href={`/contacts/${contact.slug}`} style={{ textDecoration: "none", color: "inherit" }}>
                <span style={{ fontSize: 12, color: "var(--text-muted-custom)" }}>
                  {contact.lastContactDate ? relativeTime(contact.lastContactDate) : "—"}
                </span>
              </Link>
            </td>
            <td style={cellStyle}>
              <Link href={`/contacts/${contact.slug}`} style={{ textDecoration: "none", color: "inherit" }}>
                <Icon name="chevronR" size={14} color="var(--text-muted-custom)" />
              </Link>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
