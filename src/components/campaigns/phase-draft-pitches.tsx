"use client";

import { useState, useRef, useCallback, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveBrief, bulkApproveOutreaches } from "@/actions/outreach-actions";
import { ContactPicker } from "./contact-picker";
import { PitchCard } from "./pitch-card";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";

interface DraftPitchesPhaseProps {
  campaign: {
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
  campaignContacts: {
    id: string;
    contactId: string;
    status?: string;
    contact: {
      id: string;
      name: string;
      initials: string;
      avatarBg: string;
      avatarFg: string;
      publication: string | null;
      beat?: string | null;
      tier?: string | null;
      health?: string | null;
    };
  }[];
  availableContacts: {
    id: string;
    name: string;
    initials: string;
    avatarBg: string;
    avatarFg: string;
    publication: string | null;
    beat?: string | null;
    tier?: string | null;
  }[];
  outreaches: {
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

export function DraftPitchesPhase({
  campaign,
  campaignContacts,
  availableContacts,
  outreaches,
}: DraftPitchesPhaseProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [brief, setBrief] = useState(campaign.brief || "");
  const [briefStatus, setBriefStatus] = useState<"idle" | "saving" | "saved">("idle");
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // AI generation state
  const [generating, setGenerating] = useState(false);
  const [generatingContact, setGeneratingContact] = useState<string | null>(null);
  const [genError, setGenError] = useState<string | null>(null);

  const contactsWithoutDraft = campaignContacts.filter(
    (cc) => !outreaches.some((o) => o.contactId === cc.contactId)
  );
  const draftOutreaches = outreaches.filter((o) => o.status === "draft");
  const allApproved = outreaches.length > 0 && outreaches.every((o) => o.status === "approved");
  const sortedOutreaches = [...outreaches].sort((a, b) =>
    a.contact.name.localeCompare(b.contact.name)
  );

  // Debounced brief save
  const handleBriefChange = useCallback(
    (value: string) => {
      setBrief(value);
      setBriefStatus("idle");
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(async () => {
        setBriefStatus("saving");
        await saveBrief(campaign.id, value);
        setBriefStatus("saved");
        setTimeout(() => setBriefStatus("idle"), 2000);
      }, 1500);
    },
    [campaign.id]
  );

  // Generate pitches via SSE
  async function handleGenerate(contactIds?: string[]) {
    const ids =
      contactIds ||
      (contactsWithoutDraft.length > 0
        ? contactsWithoutDraft.map((cc) => cc.contactId)
        : campaignContacts.map((cc) => cc.contactId));

    if (ids.length === 0) return;

    setGenerating(true);
    setGenError(null);
    setGeneratingContact(null);

    try {
      const res = await fetch("/api/generate-pitches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campaignId: campaign.id, contactIds: ids }),
      });

      if (!res.ok) {
        const err = await res.json();
        setGenError(err.error || "Failed to generate pitches");
        setGenerating(false);
        return;
      }

      const reader = res.body?.getReader();
      if (!reader) {
        setGenError("No response stream");
        setGenerating(false);
        return;
      }

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          const dataStr = line.replace(/^data: /, "").trim();
          if (!dataStr) continue;

          try {
            const data = JSON.parse(dataStr);
            if (data.type === "generating") {
              setGeneratingContact(data.contactName);
            } else if (data.type === "error") {
              setGenError(`Error generating for ${data.contactId}: ${data.error}`);
            } else if (data.type === "done") {
              setGeneratingContact(null);
            }
          } catch {
            // skip malformed events
          }
        }
      }

      router.refresh();
    } catch (err) {
      setGenError(err instanceof Error ? err.message : "Failed to generate pitches");
    } finally {
      setGenerating(false);
      setGeneratingContact(null);
    }
  }

  function handleRegenerate(contactId: string) {
    handleGenerate([contactId]);
  }

  function handleBulkApprove() {
    startTransition(async () => {
      await bulkApproveOutreaches(campaign.id);
      router.refresh();
    });
  }

  const hasContacts = campaignContacts.length > 0;
  const hasDrafts = outreaches.length > 0;
  const generateLabel =
    contactsWithoutDraft.length > 0
      ? `Generate for ${contactsWithoutDraft.length} contact${contactsWithoutDraft.length === 1 ? "" : "s"}`
      : "Regenerate All Pitches";
  const canGenerate = hasContacts && brief.trim().length > 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* 1. Brief Section */}
      <div>
        <label
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: "var(--text-sub)",
            display: "block",
            marginBottom: 6,
          }}
        >
          Campaign Brief
        </label>
        <textarea
          value={brief}
          onChange={(e) => handleBriefChange(e.target.value)}
          rows={5}
          placeholder="Describe your campaign, key messages, target audience, and goals..."
          style={{
            width: "100%",
            fontSize: 13,
            color: "var(--text-primary)",
            backgroundColor: "var(--page-bg)",
            border: "1px solid var(--border-custom)",
            borderRadius: 8,
            padding: "10px 12px",
            resize: "vertical",
            outline: "none",
            lineHeight: 1.5,
            fontFamily: "inherit",
          }}
        />
        {briefStatus !== "idle" && (
          <div style={{ fontSize: 11, color: "var(--text-muted-custom)", marginTop: 4 }}>
            {briefStatus === "saving" ? "Saving..." : "Saved"}
          </div>
        )}
      </div>

      {/* 2. Contact Picker */}
      <ContactPicker
        campaignId={campaign.id}
        campaignContacts={campaignContacts}
        availableContacts={availableContacts}
        outreaches={outreaches.map((o) => ({ contactId: o.contactId, status: o.status }))}
        brief={brief || null}
        clientName={campaign.client.name}
        industry={campaign.client.industry}
      />

      {/* 3. Generate Button */}
      {hasContacts && (
        <div>
          <Button
            variant="primary"
            size="md"
            icon="sparkle"
            disabled={!canGenerate || generating}
            onClick={() => handleGenerate()}
          >
            {generating ? "Generating..." : generateLabel}
          </Button>

          {generating && generatingContact && (
            <div
              style={{
                marginTop: 10,
                display: "flex",
                alignItems: "center",
                gap: 8,
                fontSize: 13,
                color: "var(--text-sub)",
              }}
            >
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  backgroundColor: "var(--accent-custom)",
                  display: "inline-block",
                  animation: "pulse 1.2s ease-in-out infinite",
                }}
              />
              Generating pitch for {generatingContact}...
              <style>{`@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }`}</style>
            </div>
          )}

          {genError && (
            <div style={{ marginTop: 8, fontSize: 12, color: "var(--amber)" }}>{genError}</div>
          )}
        </div>
      )}

      {/* 4. Draft Review */}
      {!hasDrafts && !hasContacts && (
        <div
          style={{
            textAlign: "center",
            padding: "30px 20px",
            color: "var(--text-muted-custom)",
            fontSize: 13,
          }}
        >
          Add contacts and write a brief to get started
        </div>
      )}

      {hasContacts && !hasDrafts && !generating && (
        <div
          style={{
            textAlign: "center",
            padding: "20px",
            color: "var(--text-muted-custom)",
            fontSize: 13,
          }}
        >
          Click &quot;Generate Pitches&quot; to create AI-drafted pitches for {campaignContacts.length} contact
          {campaignContacts.length === 1 ? "" : "s"}
        </div>
      )}

      {hasDrafts && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {sortedOutreaches.map((outreach) => (
            <PitchCard key={outreach.id} outreach={outreach} onRegenerate={handleRegenerate} />
          ))}
        </div>
      )}

      {/* 5. Bulk Actions */}
      {hasDrafts && (
        <div style={{ paddingTop: 8 }}>
          {allApproved ? (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "12px 16px",
                borderRadius: 8,
                backgroundColor: "var(--green-bg)",
                border: "1px solid var(--green-border)",
                color: "var(--green)",
                fontSize: 13,
                fontWeight: 500,
              }}
            >
              <Icon name="check" size={14} color="var(--green)" />
              All {outreaches.length} pitch{outreaches.length === 1 ? "" : "es"} approved — ready
              for outreach
            </div>
          ) : (
            <Button
              variant="primary"
              size="md"
              onClick={handleBulkApprove}
              disabled={isPending}
              style={{ backgroundColor: "var(--accent-custom)", borderColor: "var(--accent-custom)" }}
            >
              Approve All ({draftOutreaches.length} draft{draftOutreaches.length === 1 ? "" : "s"})
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
