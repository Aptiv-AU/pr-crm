"use client";

import { useState, useTransition } from "react";
import { createCampaign, updateCampaign } from "@/actions/campaign-actions";
import { Button } from "@/components/ui/button";

interface CampaignFormProps {
  campaign?: {
    id: string;
    name: string;
    type: string;
    status: string;
    budget: number | null;
    startDate: string | null;
    dueDate: string | null;
    brief: string | null;
    clientId: string;
  } | null;
  clients: { id: string; name: string; initials: string; colour: string; bgColour: string }[];
  onSuccess: () => void;
}

const CAMPAIGN_TYPES = [
  { value: "press", label: "Press" },
  { value: "event", label: "Event" },
  { value: "gifting", label: "Gifting" },
];

export function CampaignForm({ campaign, clients, onSuccess }: CampaignFormProps) {
  const isEdit = !!campaign;
  const [clientId, setClientId] = useState(campaign?.clientId ?? "");
  const [name, setName] = useState(campaign?.name ?? "");
  const [type, setType] = useState(campaign?.type ?? "press");
  const [status, setStatus] = useState(campaign?.status ?? "draft");
  const [budget, setBudget] = useState(campaign?.budget != null ? String(campaign.budget) : "");
  const [startDate, setStartDate] = useState(campaign?.startDate ?? "");
  const [dueDate, setDueDate] = useState(campaign?.dueDate ?? "");
  const [brief, setBrief] = useState(campaign?.brief ?? "");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit() {
    setError(null);
    startTransition(async () => {
      const formData = new FormData();
      formData.set("name", name);
      formData.set("type", type);
      formData.set("clientId", clientId);
      formData.set("budget", budget);
      formData.set("startDate", startDate);
      formData.set("dueDate", dueDate);
      formData.set("brief", brief);
      if (isEdit) {
        formData.set("status", status);
      }

      const result = isEdit
        ? await updateCampaign(campaign!.id, formData)
        : await createCampaign(formData);

      if (result.error) {
        setError(result.error);
      } else {
        onSuccess();
      }
    });
  }

  const selectedClient = clients.find((c) => c.id === clientId);

  const inputStyle = {
    width: "100%",
    height: 34,
    padding: "0 10px",
    fontSize: 13,
    borderRadius: 7,
    border: "1px solid var(--border-custom)",
    backgroundColor: "var(--page-bg)",
    color: "var(--text-primary)",
    outline: "none",
  } as const;

  const labelStyle = {
    fontSize: 12,
    fontWeight: 500 as const,
    color: "var(--text-sub)",
    marginBottom: 6,
    display: "block" as const,
  };

  const toggleBtnBase = {
    height: 30,
    padding: "0 14px",
    fontSize: 12,
    fontWeight: 500 as const,
    borderRadius: 7,
    cursor: "pointer" as const,
    border: "1px solid var(--border-custom)",
    backgroundColor: "var(--page-bg)",
    color: "var(--text-sub)",
    transition: "all 0.15s",
  };

  const toggleBtnActive = {
    ...toggleBtnBase,
    backgroundColor: "var(--accent-custom)",
    color: "#fff",
    borderColor: "var(--accent-custom)",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column" as const, gap: 20 }}>
      {/* Client Select */}
      <div>
        <label style={labelStyle}>Client</label>
        <div style={{ position: "relative" as const }}>
          {selectedClient && (
            <div
              style={{
                position: "absolute" as const,
                left: 8,
                top: "50%",
                transform: "translateY(-50%)",
                width: 20,
                height: 20,
                borderRadius: 4,
                backgroundColor: selectedClient.bgColour,
                color: selectedClient.colour,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 8,
                fontWeight: 700,
                pointerEvents: "none" as const,
                zIndex: 1,
              }}
            >
              {selectedClient.initials}
            </div>
          )}
          <select
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
            disabled={isEdit}
            style={{
              ...inputStyle,
              paddingLeft: selectedClient ? 34 : 10,
              appearance: "none" as const,
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23888' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")`,
              backgroundRepeat: "no-repeat",
              backgroundPosition: "right 10px center",
              paddingRight: 28,
              opacity: isEdit ? 0.6 : 1,
            }}
          >
            <option value="">Select a client...</option>
            {clients.map((client) => (
              <option key={client.id} value={client.id}>
                {client.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Campaign Name */}
      <div>
        <label style={labelStyle}>Campaign Name</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g., Spring Launch Press Push"
          style={inputStyle}
        />
      </div>

      {/* Type Toggle */}
      <div>
        <label style={labelStyle}>Type</label>
        <div style={{ display: "flex", gap: 8 }}>
          {CAMPAIGN_TYPES.map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => !isEdit && setType(t.value)}
              disabled={isEdit}
              style={{
                ...(type === t.value ? toggleBtnActive : toggleBtnBase),
                opacity: isEdit ? 0.6 : 1,
                cursor: isEdit ? "not-allowed" : "pointer",
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Status (edit only) */}
      {isEdit && (
        <div>
          <label style={labelStyle}>Status</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            style={{
              ...inputStyle,
              appearance: "none" as const,
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23888' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")`,
              backgroundRepeat: "no-repeat",
              backgroundPosition: "right 10px center",
              paddingRight: 28,
            }}
          >
            <option value="draft">Draft</option>
            <option value="active">Active</option>
            <option value="outreach">Outreach</option>
            <option value="complete">Complete</option>
          </select>
        </div>
      )}

      {/* Budget */}
      <div>
        <label style={labelStyle}>Budget</label>
        <div style={{ position: "relative" as const }}>
          <span
            style={{
              position: "absolute" as const,
              left: 10,
              top: "50%",
              transform: "translateY(-50%)",
              fontSize: 13,
              color: "var(--text-muted-custom)",
              pointerEvents: "none" as const,
            }}
          >
            $
          </span>
          <input
            type="number"
            value={budget}
            onChange={(e) => setBudget(e.target.value)}
            placeholder="0.00"
            step="0.01"
            min="0"
            style={{ ...inputStyle, paddingLeft: 22 }}
          />
        </div>
      </div>

      {/* Start Date */}
      <div>
        <label style={labelStyle}>Start Date</label>
        <input
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          style={inputStyle}
        />
      </div>

      {/* Due Date */}
      <div>
        <label style={labelStyle}>Due Date</label>
        <input
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
          style={inputStyle}
        />
      </div>

      {/* Brief */}
      <div>
        <label style={labelStyle}>Brief</label>
        <textarea
          value={brief}
          onChange={(e) => setBrief(e.target.value)}
          placeholder="Key messages, angle, assets..."
          rows={4}
          style={{
            ...inputStyle,
            height: "auto",
            padding: "8px 10px",
            resize: "vertical" as const,
          }}
        />
      </div>

      {/* Error */}
      {error && (
        <div
          style={{
            fontSize: 12,
            color: "var(--amber)",
            padding: "8px 10px",
            borderRadius: 7,
            backgroundColor: "var(--amber-bg)",
            border: "1px solid var(--amber-border)",
          }}
        >
          {error}
        </div>
      )}

      {/* Submit */}
      <Button
        variant="primary"
        size="md"
        onClick={handleSubmit}
        disabled={isPending}
        style={{ width: "100%" }}
      >
        {isPending ? "Saving..." : isEdit ? "Update Campaign" : "Create Campaign"}
      </Button>
    </div>
  );
}
