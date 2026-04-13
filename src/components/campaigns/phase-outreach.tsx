"use client";

import { Card } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";

export function OutreachPhase() {
  return (
    <Card style={{ padding: 40 }}>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 12,
          textAlign: "center",
        }}
      >
        <Icon name="mail" size={24} color="var(--text-muted-custom)" />
        <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>
          Send &amp; Track Outreach
        </div>
        <div style={{ fontSize: 13, color: "var(--text-muted-custom)", maxWidth: 340 }}>
          Connect your email account to send approved pitches directly. Coming in Phase 5B.
        </div>
      </div>
    </Card>
  );
}
