"use client";

import { Badge, type BadgeVariant } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

interface EventHeroProps {
  campaign: {
    id: string;
    name: string;
    status: string;
    client: {
      id: string;
      name: string;
      initials: string;
      colour: string;
      bgColour: string;
    };
  };
  eventDetail: {
    id: string;
    venue: string | null;
    eventDate: string | null;
    eventTime: string | null;
    guestCount: number | null;
  };
  onEdit: () => void;
}

const statusVariantMap: Record<string, BadgeVariant> = {
  active: "active",
  outreach: "outreach",
  draft: "draft",
  complete: "default",
};

function formatEventDate(date: string | null): string | null {
  if (!date) return null;
  const d = new Date(date);
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function EventHero({ campaign, eventDetail, onEdit }: EventHeroProps) {
  const formattedDate = formatEventDate(eventDetail.eventDate);

  return (
    <Card style={{ padding: 20 }}>
      {/* Top row */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
        <div
          style={{
            width: 20,
            height: 20,
            borderRadius: 5,
            backgroundColor: campaign.client.bgColour,
            color: campaign.client.colour,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 9,
            fontWeight: 600,
            flexShrink: 0,
          }}
        >
          {campaign.client.initials}
        </div>
        <span
          className="text-2xl md:text-[28px] font-extrabold tracking-tight"
          style={{ color: "var(--text-primary)" }}
        >
          {campaign.name}
        </span>
        <Badge variant="default">Event</Badge>
        <Badge variant={statusVariantMap[campaign.status] ?? "default"}>
          {campaign.status === "complete"
            ? "Complete"
            : campaign.status.charAt(0).toUpperCase() + campaign.status.slice(1)}
        </Badge>
      </div>

      {/* Venue */}
      {eventDetail.venue && (
        <div style={{ fontSize: 14, color: "var(--text-sub)", marginBottom: 4 }}>
          {eventDetail.venue}
        </div>
      )}

      {/* Date + time */}
      {formattedDate && (
        <div style={{ fontSize: 13, color: "var(--text-primary)", marginBottom: 4 }}>
          {formattedDate}
          {eventDetail.eventTime && (
            <span style={{ color: "var(--text-sub)", marginLeft: 8 }}>
              {eventDetail.eventTime}
            </span>
          )}
        </div>
      )}

      {/* Guest count */}
      {eventDetail.guestCount != null && eventDetail.guestCount > 0 && (
        <div style={{ fontSize: 13, color: "var(--text-sub)", marginBottom: 4 }}>
          {eventDetail.guestCount} guests
        </div>
      )}

      {/* Actions */}
      <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
        <Button variant="default" size="sm" icon="edit" onClick={onEdit}>
          Edit Details
        </Button>
      </div>
    </Card>
  );
}
