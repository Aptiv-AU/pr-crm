"use client";

import { ContactAvatar } from "@/components/shared/contact-avatar";
import { Badge, type BadgeVariant } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { titleCase } from "@/lib/format/title-case";

interface ContactHeroProps {
  contact: {
    id: string;
    name: string;
    email: string | null;
    outlet: string;
    beat: string;
    tier: string;
    health: string;
    initials: string;
    avatarBg: string;
    avatarFg: string;
    photo?: string | null;
    title?: string | null;
    city?: string | null;
  };
  onEdit: () => void;
  onNewPitch?: () => void;
  onBack?: () => void;
}

const TIER_VAR: Record<string, BadgeVariant> = {
  A: "tierA",
  B: "tierB",
  C: "tierC",
  D: "tierD",
};

export function ContactHero({ contact, onEdit, onNewPitch, onBack }: ContactHeroProps) {
  const tierVariant = TIER_VAR[contact.tier] ?? "default";
  const healthVariant: BadgeVariant = contact.health === "warm" ? "warm" : "cool";
  const profileTitle = contact.title ?? "";
  const profileLocation = contact.city ?? "";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
      {onBack && (
        <div>
          <Button size="xs" variant="ghost" icon="chevronL" onClick={onBack}>
            Back to contacts
          </Button>
        </div>
      )}

      <Card style={{ padding: 24 }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 18, flexWrap: "wrap" }}>
          <ContactAvatar contact={contact} size={72} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <span style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-0.015em", color: "var(--text-primary)" }}>
                {contact.name}
              </span>
              <Badge variant={tierVariant}>{contact.tier}-list</Badge>
              <Badge variant={healthVariant}>{titleCase(contact.health)}</Badge>
            </div>
            {(profileTitle || contact.outlet) && (
              <div
                style={{
                  fontSize: 14,
                  fontStyle: "italic",
                  color: "var(--text-sub)",
                  fontWeight: 500,
                  marginTop: 6,
                }}
              >
                {profileTitle ? `${profileTitle} · ${contact.outlet}` : contact.outlet}
              </div>
            )}
            <div style={{ display: "flex", gap: 18, marginTop: 14, flexWrap: "wrap" }}>
              {contact.email && (
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    fontSize: 12,
                    color: "var(--text-sub)",
                    fontWeight: 500,
                  }}
                >
                  <Icon name="mail" size={12} color="var(--text-sub)" />
                  <span style={{ fontFamily: "var(--font-mono)" }}>{contact.email}</span>
                </span>
              )}
              {(contact.beat || profileLocation) && (
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    fontSize: 12,
                    color: "var(--text-sub)",
                    fontWeight: 500,
                  }}
                >
                  <Icon name="tag" size={12} color="var(--text-sub)" />
                  {[contact.beat, profileLocation].filter(Boolean).join(" · ")}
                </span>
              )}
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Button size="sm" variant="outline" icon="edit" onClick={onEdit}>
              Edit
            </Button>
            <Button size="sm" variant="primary" icon="outreach" onClick={onNewPitch}>
              New pitch
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
