"use client";

import { useTransition } from "react";
import { Icon } from "@/components/ui/icon";

interface Phase {
  id: string;
  name: string;
  order: number;
  status: string;
}

interface CampaignPhaseListProps {
  phases: Phase[];
  onUpdatePhase: (phaseId: string, status: string) => void;
}

function StatusCircle({ status }: { status: string }) {
  if (status === "complete") {
    return (
      <div
        style={{
          width: 16,
          height: 16,
          borderRadius: "50%",
          backgroundColor: "var(--green)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <Icon name="check" size={10} color="#fff" />
      </div>
    );
  }

  if (status === "active") {
    return (
      <div
        style={{
          width: 16,
          height: 16,
          borderRadius: "50%",
          border: "2px solid var(--accent-custom)",
          backgroundColor: "var(--accent-bg)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <div
          style={{
            width: 6,
            height: 6,
            borderRadius: "50%",
            backgroundColor: "var(--accent-custom)",
          }}
        />
      </div>
    );
  }

  // pending
  return (
    <div
      style={{
        width: 16,
        height: 16,
        borderRadius: "50%",
        border: "2px solid var(--border-custom)",
        flexShrink: 0,
      }}
    />
  );
}

export function CampaignPhaseList({ phases, onUpdatePhase }: CampaignPhaseListProps) {
  const [isPending, startTransition] = useTransition();

  function handleClick(phase: Phase) {
    if (isPending) return;
    if (phase.status === "active") {
      startTransition(() => {
        onUpdatePhase(phase.id, "complete");
      });
    } else if (phase.status === "pending") {
      startTransition(() => {
        onUpdatePhase(phase.id, "complete");
      });
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", position: "relative" }}>
      {phases.map((phase, index) => (
        <div
          key={phase.id}
          onClick={() => handleClick(phase)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "10px 0",
            cursor: phase.status === "complete" ? "default" : "pointer",
            position: "relative",
            opacity: isPending ? 0.6 : 1,
          }}
        >
          {/* Vertical line */}
          {index < phases.length - 1 && (
            <div
              style={{
                position: "absolute",
                left: 7,
                top: 26,
                bottom: -10,
                width: 2,
                backgroundColor: "var(--border-custom)",
              }}
            />
          )}

          <StatusCircle status={phase.status} />

          <div style={{ flex: 1 }}>
            <div
              style={{
                fontSize: 13,
                fontWeight: phase.status === "active" ? 600 : 500,
                color:
                  phase.status === "active"
                    ? "var(--text-primary)"
                    : phase.status === "complete"
                      ? "var(--text-sub)"
                      : "var(--text-muted-custom)",
              }}
            >
              {phase.name}
            </div>
          </div>

          <div
            style={{
              fontSize: 11,
              color:
                phase.status === "active"
                  ? "var(--accent-text)"
                  : phase.status === "complete"
                    ? "var(--green)"
                    : "var(--text-muted-custom)",
            }}
          >
            {phase.status === "active"
              ? "Active"
              : phase.status === "complete"
                ? "Complete"
                : "Pending"}
          </div>
        </div>
      ))}
    </div>
  );
}
