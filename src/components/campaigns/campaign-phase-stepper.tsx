"use client";

interface Phase {
  id: string;
  name: string;
  order: number;
  status: string;
}

interface CampaignPhaseStepperProps {
  phases: Phase[];
  isPending?: boolean;
  onAdvance: (phaseId: string) => void;
  onRevert: (phaseId: string) => void;
}

const TEAL = "#006C49";

export function CampaignPhaseStepper({ phases, isPending = false, onAdvance, onRevert }: CampaignPhaseStepperProps) {
  function handleClick(phase: Phase) {
    if (isPending) return;
    if (phase.status === "complete") {
      onRevert(phase.id);
    } else {
      onAdvance(phase.id);
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
      {phases.map((phase, index) => {
        const isComplete = phase.status === "complete";
        const isActive = phase.status === "active";
        const dotColor = isComplete || isActive ? TEAL : "var(--border-mid)";
        const labelColor = isComplete || isActive ? TEAL : "var(--text-muted-custom)";
        const connectorColor = isComplete ? TEAL : "var(--border-custom)";
        return (
          <div key={phase.id} style={{ display: "flex", alignItems: "center", flex: 1, minWidth: 0 }}>
            <button
              type="button"
              onClick={() => handleClick(phase)}
              title={
                isComplete
                  ? `Revert to ${phase.name}`
                  : isActive
                    ? `${phase.name} — in progress`
                    : `Advance to ${phase.name}`
              }
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 6,
                padding: "6px 8px",
                background: "none",
                border: "none",
                cursor: isActive ? "default" : "pointer",
                flex: 1,
                minWidth: 60,
              }}
            >
              <div
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: "50%",
                  backgroundColor: dotColor,
                  opacity: phase.status === "pending" ? 0.6 : 1,
                  flexShrink: 0,
                }}
              />
              <div
                style={{
                  fontSize: 9,
                  fontWeight: isActive ? 800 : 600,
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  color: labelColor,
                  textAlign: "center",
                  lineHeight: 1.3,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  maxWidth: 90,
                }}
              >
                {phase.name}
              </div>
            </button>

            {index < phases.length - 1 && (
              <div
                style={{
                  height: 2,
                  flex: 1,
                  backgroundColor: connectorColor,
                  marginTop: -16,
                }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
