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

interface ContactCardListProps {
  contacts: ContactRow[];
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

export function ContactCardList({ contacts }: ContactCardListProps) {
  return (
    <div style={{ display: "flex", flexDirection: "column" as const, gap: 8 }}>
      {contacts.map((contact) => (
        <Link
          key={contact.id}
          href={`/contacts/${contact.slug}`}
          style={{
            textDecoration: "none",
            color: "inherit",
            display: "flex",
            alignItems: "center",
            gap: 14,
            padding: 16,
            borderRadius: 12,
            backgroundColor: "var(--card-bg)",
            boxShadow: "0 1px 2px rgba(15, 23, 42, 0.04)",
            transition: "box-shadow 0.15s",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.boxShadow = "0 4px 12px rgba(15, 23, 42, 0.08)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.boxShadow = "0 1px 2px rgba(15, 23, 42, 0.04)";
          }}
        >
          <ContactAvatar contact={contact} size={44} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>
              {contact.name}
            </div>
            <div className="text-xs italic font-medium mt-0.5" style={{ color: "var(--text-sub)" }}>
              {contact.outlet}
            </div>
            <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
              <TierBadge tier={contact.tier} />
              <HealthBadge health={contact.health} />
            </div>
          </div>
          <Icon name="chevronR" size={14} color="var(--text-muted-custom)" />
        </Link>
      ))}
    </div>
  );
}
