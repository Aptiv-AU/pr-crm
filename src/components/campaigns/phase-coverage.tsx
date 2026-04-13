"use client";

import { Card } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";

export function CoveragePhase() {
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
        <Icon name="coverage" size={24} color="var(--text-muted-custom)" />
        <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>
          Coverage Tracking
        </div>
        <div style={{ fontSize: 13, color: "var(--text-muted-custom)", maxWidth: 340 }}>
          Log coverage results and track media value. Coming in Phase 5C.
        </div>
      </div>
    </Card>
  );
}
