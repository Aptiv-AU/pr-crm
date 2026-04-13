"use client";

import { useState, useTransition } from "react";
import { Icon } from "@/components/ui/icon";
import { DraftPitchesPhase } from "./phase-draft-pitches";
import { OutreachPhase } from "./phase-outreach";
import { CoveragePhase } from "./phase-coverage";

interface Phase {
  id: string;
  name: string;
  order: number;
  status: string;
}

interface CampaignPhaseListProps {
  phases: Phase[];
  campaignType: string;
  onUpdatePhase: (phaseId: string, status: string) => void;
  // Only for press campaigns:
  campaign?: {
    id: string;
    brief: string | null;
    client: {
      id: string;
      name: string;
      industry: string | null;
      initials: string;
      colour: string;
      bgColour: string;
    };
  };
  campaignContacts?: {
    id: string;
    contactId: string;
    status: string;
    contact: {
      id: string;
      name: string;
      initials: string;
      avatarBg: string;
      avatarFg: string;
      publication: string | null;
      tier: string | null;
      health: string | null;
    };
  }[];
  availableContacts?: {
    id: string;
    name: string;
    initials: string;
    avatarBg: string;
    avatarFg: string;
    publication: string | null;
  }[];
  outreaches?: {
    id: string;
    subject: string;
    body: string;
    status: string;
    generatedByAI: boolean;
    contactId: string;
    contact: {
      id: string;
      name: string;
      initials: string;
      avatarBg: string;
      avatarFg: string;
      publication: string | null;
    };
  }[];
}

function StatusCircle({ status, size = 16 }: { status: string; size?: number }) {
  if (status === "complete") {
    return (
      <div
        style={{
          width: size,
          height: size,
          borderRadius: "50%",
          backgroundColor: "var(--green)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <Icon name="check" size={size * 0.625} color="#fff" />
      </div>
    );
  }

  if (status === "active") {
    return (
      <div
        style={{
          width: size,
          height: size,
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
            width: size * 0.375,
            height: size * 0.375,
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
        width: size,
        height: size,
        borderRadius: "50%",
        border: "2px solid var(--border-custom)",
        flexShrink: 0,
      }}
    />
  );
}

/** Simple checkbox-style phase list for event/gifting campaigns */
function SimplePhaseList({
  phases,
  onUpdatePhase,
}: {
  phases: Phase[];
  onUpdatePhase: (phaseId: string, status: string) => void;
}) {
  const [isPending, startTransition] = useTransition();

  function handleClick(phase: Phase) {
    if (isPending) return;
    if (phase.status === "active" || phase.status === "pending") {
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

/** Stepper with content panels for press campaigns */
function PressPhaseStepper({
  phases,
  onUpdatePhase,
  campaign,
  campaignContacts,
  availableContacts,
  outreaches,
}: {
  phases: Phase[];
  onUpdatePhase: (phaseId: string, status: string) => void;
  campaign: NonNullable<CampaignPhaseListProps["campaign"]>;
  campaignContacts: NonNullable<CampaignPhaseListProps["campaignContacts"]>;
  availableContacts: NonNullable<CampaignPhaseListProps["availableContacts"]>;
  outreaches: NonNullable<CampaignPhaseListProps["outreaches"]>;
}) {
  // Default to the first active phase, or last phase if all complete
  const activePhaseIndex = phases.findIndex((p) => p.status === "active");
  const [selectedIndex, setSelectedIndex] = useState(
    activePhaseIndex >= 0 ? activePhaseIndex : phases.length - 1
  );

  const selectedPhase = phases[selectedIndex];

  function renderPhaseContent() {
    if (!selectedPhase) return null;

    if (selectedPhase.status === "pending") {
      return (
        <div
          style={{
            textAlign: "center",
            padding: "40px 20px",
            color: "var(--text-muted-custom)",
            fontSize: 13,
          }}
        >
          <div style={{ marginTop: 8 }}>
            Complete the previous phase to unlock{" "}
            <strong style={{ color: "var(--text-sub)" }}>{selectedPhase.name}</strong>
          </div>
        </div>
      );
    }

    const phaseName = selectedPhase.name.toLowerCase();

    if (phaseName.includes("draft") || phaseName.includes("pitch")) {
      return (
        <DraftPitchesPhase
          campaign={campaign as any}
          campaignContacts={campaignContacts as any}
          availableContacts={availableContacts as any}
          outreaches={outreaches as any}
        />
      );
    }

    if (phaseName.includes("outreach") || phaseName.includes("send")) {
      return <OutreachPhase />;
    }

    if (phaseName.includes("coverage") || phaseName.includes("track")) {
      return <CoveragePhase />;
    }

    // Fallback for unknown phase names
    return (
      <div
        style={{
          textAlign: "center",
          padding: "40px 20px",
          color: "var(--text-muted-custom)",
          fontSize: 13,
        }}
      >
        {selectedPhase.name}
      </div>
    );
  }

  return (
    <div
      style={{
        display: "flex",
        gap: 24,
        minHeight: 200,
      }}
    >
      {/* Left: vertical stepper */}
      <div
        style={{
          width: 180,
          flexShrink: 0,
          display: "flex",
          flexDirection: "column",
          position: "relative",
        }}
      >
        {phases.map((phase, index) => (
          <div key={phase.id} style={{ position: "relative" }}>
            {/* Connector line */}
            {index < phases.length - 1 && (
              <div
                style={{
                  position: "absolute",
                  left: 9,
                  top: 28,
                  bottom: -8,
                  width: 2,
                  backgroundColor:
                    phase.status === "complete"
                      ? "var(--green)"
                      : "var(--border-custom)",
                }}
              />
            )}

            <button
              type="button"
              onClick={() => setSelectedIndex(index)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "8px 10px",
                width: "100%",
                border: "none",
                borderRadius: 8,
                cursor: "pointer",
                backgroundColor:
                  selectedIndex === index
                    ? "var(--hover-bg)"
                    : "transparent",
                transition: "background-color 150ms ease",
              }}
              onMouseEnter={(e) => {
                if (selectedIndex !== index) {
                  (e.currentTarget as HTMLElement).style.backgroundColor = "var(--hover-bg)";
                }
              }}
              onMouseLeave={(e) => {
                if (selectedIndex !== index) {
                  (e.currentTarget as HTMLElement).style.backgroundColor = "transparent";
                }
              }}
            >
              <StatusCircle status={phase.status} size={20} />
              <span
                style={{
                  fontSize: 13,
                  fontWeight: selectedIndex === index ? 600 : 500,
                  color:
                    phase.status === "pending"
                      ? "var(--text-muted-custom)"
                      : phase.status === "active"
                        ? "var(--text-primary)"
                        : "var(--text-sub)",
                  textAlign: "left",
                }}
              >
                {phase.name}
              </span>
            </button>
          </div>
        ))}
      </div>

      {/* Right: content panel */}
      <div
        style={{
          flex: 1,
          minWidth: 0,
          borderLeft: "1px solid var(--border-custom)",
          paddingLeft: 24,
        }}
      >
        {renderPhaseContent()}
      </div>
    </div>
  );
}

export function CampaignPhaseList({
  phases,
  campaignType,
  onUpdatePhase,
  campaign,
  campaignContacts,
  availableContacts,
  outreaches,
}: CampaignPhaseListProps) {
  // Press campaigns get the full stepper with content panels
  if (
    campaignType === "press" &&
    campaign &&
    campaignContacts &&
    availableContacts &&
    outreaches
  ) {
    return (
      <PressPhaseStepper
        phases={phases}
        onUpdatePhase={onUpdatePhase}
        campaign={campaign}
        campaignContacts={campaignContacts}
        availableContacts={availableContacts}
        outreaches={outreaches}
      />
    );
  }

  // Event/gifting campaigns keep simple checkbox behavior
  return <SimplePhaseList phases={phases} onUpdatePhase={onUpdatePhase} />;
}
