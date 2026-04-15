"use client";

import { useTransition } from "react";

interface Phase {
  id: string;
  name: string;
  order: number;
  status: string; // "pending" | "active" | "complete"
}

interface CampaignPhaseStepperProps {
  phases: Phase[];
  onAdvance: (phaseId: string) => void;
  onRevert: (phaseId: string) => void;
}

export function CampaignPhaseStepper({ phases, onAdvance, onRevert }: CampaignPhaseStepperProps) {
  const [isPending, startTransition] = useTransition();

  function handleClick(phase: Phase) {
    if (isPending) return;
    if (phase.status === "complete") {
      startTransition(() => onRevert(phase.id));
    } else {
      startTransition(() => onAdvance(phase.id));
    }
  }

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 0,
        opacity: isPending ? 0.6 : 1,
        overflowX: "auto",
        paddingBottom: 2,
      }}
    >
      {phases.map((phase, index) => (
        <div key={phase.id} style={{ display: "flex", alignItems: "center", flex: 1, minWidth: 0 }}>
          {/* Step */}
          <button
            type="button"
            onClick={() => handleClick(phase)}
            title={
              phase.status === "complete"
                ? `Revert to ${phase.name}`
                : phase.status === "active"
                  ? `${phase.name} — in progress`
                  : `Advance to ${phase.name}`
            }
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 4,
              padding: "6px 8px",
              background: "none",
              border: "none",
              cursor: phase.status === "active" ? "default" : "pointer",
              flex: 1,
              minWidth: 60,
            }}
          >
            {/* Indicator dot */}
            <div
              style={{
                width: 10,
                height: 10,
                borderRadius: "50%",
                backgroundColor:
                  phase.status === "complete"
                    ? "var(--green)"
                    : phase.status === "active"
                      ? "var(--accent-custom)"
                      : "var(--border-mid)",
                flexShrink: 0,
              }}
            />
            {/* Label */}
            <div
              style={{
                fontSize: 10,
                fontWeight: phase.status === "active" ? 600 : 400,
                color:
                  phase.status === "complete"
                    ? "var(--green)"
                    : phase.status === "active"
                      ? "var(--accent-text)"
                      : "var(--text-muted-custom)",
                textAlign: "center",
                lineHeight: 1.3,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
                maxWidth: 80,
              }}
            >
              {phase.name}
            </div>
          </button>

          {/* Connector line */}
          {index < phases.length - 1 && (
            <div
              style={{
                height: 2,
                flex: 1,
                backgroundColor:
                  phase.status === "complete" ? "var(--green)" : "var(--border-custom)",
                marginTop: -14,
              }}
            />
          )}
        </div>
      ))}
    </div>
  );
}
