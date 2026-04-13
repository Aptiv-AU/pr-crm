"use client";

import Link from "next/link";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Icon } from "@/components/ui/icon";

interface ContactRow {
  id: string;
  name: string;
  initials: string;
  avatarBg: string;
  avatarFg: string;
  publication: string;
  beat: string;
  tier: string;
  health: string;
  createdAt: Date | string;
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
  return <Badge variant="default">{health.charAt(0).toUpperCase() + health.slice(1)}</Badge>;
}

export function ContactCardList({ contacts }: ContactCardListProps) {
  return (
    <div style={{ display: "flex", flexDirection: "column" as const, gap: 8 }}>
      {contacts.map((contact) => (
        <Link
          key={contact.id}
          href={`/contacts/${contact.id}`}
          style={{
            textDecoration: "none",
            color: "inherit",
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: 12,
            borderRadius: 10,
            backgroundColor: "var(--card-bg)",
            border: "1px solid var(--border-custom)",
            transition: "border-color 0.15s",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.borderColor = "var(--border-mid)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.borderColor = "var(--border-custom)";
          }}
        >
          <Avatar
            initials={contact.initials}
            bg={contact.avatarBg}
            fg={contact.avatarFg}
            size={36}
          />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 500, color: "var(--text-primary)" }}>
              {contact.name}
            </div>
            <div style={{ fontSize: 11, color: "var(--text-sub)", marginTop: 1 }}>
              {contact.publication}
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
