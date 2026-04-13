"use client";

import { Avatar } from "@/components/ui/avatar";
import { Badge, type BadgeVariant } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

interface ContactHeroProps {
  contact: {
    id: string;
    name: string;
    publication: string;
    beat: string;
    tier: string;
    health: string;
    initials: string;
    avatarBg: string;
    avatarFg: string;
  };
  stats: {
    coverageCount: number;
    replyRate: number;
    campaignCount: number;
  };
  onEdit: () => void;
}

const tierVariantMap: Record<string, BadgeVariant> = {
  A: "solid",
  B: "default",
  C: "default",
};

const healthVariantMap: Record<string, BadgeVariant> = {
  warm: "warm",
  cool: "cool",
  cold: "cool",
};

export function ContactHero({ contact, stats, onEdit }: ContactHeroProps) {
  return (
    <Card style={{ padding: 0 }}>
      <div className="p-5 md:p-6">
        {/* Header row */}
        <div className="flex flex-col md:flex-row md:items-start gap-3">
          <div style={{ display: "flex", alignItems: "center", gap: 14, flex: 1, minWidth: 0 }}>
            <Avatar
              initials={contact.initials}
              bg={contact.avatarBg}
              fg={contact.avatarFg}
              size={44}
            />
            <div style={{ minWidth: 0 }}>
              <div
                style={{
                  fontSize: 18,
                  fontWeight: 700,
                  color: "var(--text-primary)",
                  lineHeight: 1.3,
                }}
              >
                {contact.name}
              </div>
              <div
                style={{
                  fontSize: 12,
                  color: "var(--text-sub)",
                  lineHeight: 1.3,
                }}
              >
                {contact.publication}
              </div>
            </div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              <Badge variant="default">{contact.beat}</Badge>
              <Badge variant={tierVariantMap[contact.tier] ?? "default"}>
                {contact.tier}
              </Badge>
              <Badge variant={healthVariantMap[contact.health] ?? "default"}>
                {contact.health}
              </Badge>
            </div>
          </div>

          {/* Action buttons */}
          <div style={{ display: "flex", gap: 8 }} className="ml-0 md:ml-auto">
            <Button variant="default" size="sm" icon="edit" onClick={onEdit}>
              Edit
            </Button>
            <Button variant="default" size="sm" icon="mail">
              Email
            </Button>
            <Button variant="primary" size="sm" icon="plus">
              Add to campaign
            </Button>
          </div>
        </div>

        {/* Stats strip */}
        <div className="grid grid-cols-3 gap-3 mt-5">
          {[
            { label: "Coverage", value: stats.coverageCount },
            { label: "Reply rate", value: `${stats.replyRate}%` },
            { label: "Campaigns", value: stats.campaignCount },
          ].map((stat) => (
            <div
              key={stat.label}
              style={{
                padding: "10px 12px",
                borderRadius: 8,
                backgroundColor: "var(--page-bg)",
                border: "1px solid var(--border-custom)",
              }}
            >
              <div
                style={{
                  fontSize: 16,
                  fontWeight: 700,
                  color: "var(--text-primary)",
                  lineHeight: 1.2,
                }}
              >
                {stat.value}
              </div>
              <div
                style={{
                  fontSize: 11,
                  color: "var(--text-muted-custom)",
                  marginTop: 2,
                }}
              >
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}
