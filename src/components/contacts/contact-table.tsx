"use client";

import Link from "next/link";
import { ContactAvatar } from "@/components/shared/contact-avatar";
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

const TIER_COLORS: Record<string, string> = {
  A: "var(--tier-a)",
  B: "var(--tier-b)",
  C: "var(--tier-c)",
  D: "var(--tier-d)",
};

function formatDate(date: Date | string): string {
  const d = new Date(date);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) return "Today";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function TierBadge({ tier }: { tier: string }) {
  const upper = (tier || "").toUpperCase();
  const color = TIER_COLORS[upper] ?? "var(--tier-d)";
  return (
    <span
      className="inline-flex items-center justify-center rounded-lg font-black text-sm"
      style={{
        width: 32,
        height: 32,
        backgroundColor: `color-mix(in oklab, ${color} 12%, transparent)`,
        color,
        border: `1px solid color-mix(in oklab, ${color} 25%, transparent)`,
      }}
    >
      {upper || "—"}
    </span>
  );
}

function HealthBar({ health }: { health: string }) {
  const key = (health || "").toLowerCase();
  const config: Record<string, { label: string; pct: number; color: string }> = {
    warm: { label: "Warm", pct: 85, color: "var(--accent-custom)" },
    "a-list": { label: "A-List", pct: 95, color: "var(--accent-custom)" },
    alist: { label: "A-List", pct: 95, color: "var(--accent-custom)" },
    active: { label: "Active", pct: 70, color: "var(--accent-custom)" },
    cool: { label: "Cool", pct: 30, color: "var(--coral)" },
    cold: { label: "Cold", pct: 20, color: "var(--coral)" },
    contacted: { label: "Contacted", pct: 55, color: "var(--text-muted-custom)" },
    new: { label: "New", pct: 10, color: "var(--text-muted-custom)" },
  };
  const c = config[key] ?? { label: titleCase(health || "—"), pct: 40, color: "var(--text-muted-custom)" };
  return (
    <div className="flex items-center gap-2">
      <div
        className="rounded-full overflow-hidden"
        style={{ width: 60, height: 4, backgroundColor: "var(--surface-container-high)" }}
      >
        <div style={{ width: `${c.pct}%`, height: "100%", backgroundColor: c.color }} />
      </div>
      <span className="text-xs font-semibold" style={{ color: c.color }}>
        {c.label}
      </span>
    </div>
  );
}

const headerTh: React.CSSProperties = {
  fontSize: 10,
  fontWeight: 900,
  color: "var(--text-muted-custom)",
  textTransform: "uppercase",
  letterSpacing: "0.14em",
  padding: "16px 20px",
  textAlign: "left",
};

const cellTd: React.CSSProperties = {
  padding: "16px 20px",
  verticalAlign: "middle",
};

export function ContactTable({ contacts }: ContactTableProps) {
  return (
    <section
      className="rounded-xl overflow-hidden"
      style={{
        backgroundColor: "var(--card-bg)",
        boxShadow: "0 1px 2px rgba(15, 23, 42, 0.04)",
      }}
    >
      <div className="overflow-x-auto">
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ backgroundColor: "var(--surface-container-high)" }}>
              <th style={{ ...headerTh, paddingLeft: 28 }}>Name &amp; Publication</th>
              <th style={headerTh}>Beat</th>
              <th style={headerTh}>Tier</th>
              <th style={headerTh}>Relationship</th>
              <th style={headerTh}>Last Contact</th>
              <th style={{ ...headerTh, textAlign: "right", paddingRight: 28 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {contacts.map((contact, idx) => (
              <tr
                key={contact.id}
                className="group transition-colors"
                style={{
                  cursor: "pointer",
                  borderTop: idx === 0 ? "none" : "1px solid var(--surface-container)",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.backgroundColor = "var(--surface-container-low)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.backgroundColor = "";
                }}
              >
                <td style={{ ...cellTd, paddingLeft: 28 }}>
                  <Link
                    href={`/contacts/${contact.slug}`}
                    style={{ display: "flex", alignItems: "center", gap: 12, textDecoration: "none", color: "inherit" }}
                  >
                    <ContactAvatar contact={contact} size={40} />
                    <div>
                      <div className="font-bold text-sm" style={{ color: "var(--text-primary)" }}>
                        {contact.name}
                      </div>
                      <div className="text-xs italic font-medium mt-0.5" style={{ color: "var(--text-sub)" }}>
                        {contact.outlet || "—"}
                      </div>
                    </div>
                  </Link>
                </td>
                <td style={cellTd}>
                  <Link href={`/contacts/${contact.slug}`} style={{ textDecoration: "none", color: "inherit" }}>
                    <span
                      className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-tight inline-block"
                      style={{
                        backgroundColor: "var(--surface-container)",
                        color: "var(--text-sub)",
                      }}
                    >
                      {contact.beat || "—"}
                    </span>
                  </Link>
                </td>
                <td style={cellTd}>
                  <Link href={`/contacts/${contact.slug}`} style={{ textDecoration: "none", color: "inherit" }}>
                    <TierBadge tier={contact.tier} />
                  </Link>
                </td>
                <td style={cellTd}>
                  <Link href={`/contacts/${contact.slug}`} style={{ textDecoration: "none", color: "inherit" }}>
                    <HealthBar health={contact.health} />
                  </Link>
                </td>
                <td style={cellTd}>
                  <Link href={`/contacts/${contact.slug}`} style={{ textDecoration: "none", color: "inherit" }}>
                    <span className="text-xs font-medium" style={{ color: "var(--text-sub)" }}>
                      {contact.lastContactDate ? formatDate(contact.lastContactDate) : "Never"}
                    </span>
                  </Link>
                </td>
                <td style={{ ...cellTd, textAlign: "right", paddingRight: 28 }}>
                  <Link
                    href={`/contacts/${contact.slug}`}
                    style={{ display: "inline-flex", textDecoration: "none", color: "var(--text-muted-custom)" }}
                  >
                    <Icon name="chevronR" size={16} color="var(--text-muted-custom)" />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
