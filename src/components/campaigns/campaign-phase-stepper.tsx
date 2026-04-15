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
      {phases.map((phase, index) => (
        <div key={phase.id} style={{ display: "flex", alignItems: "center", flex: 1, minWidth: 0 }}>
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
