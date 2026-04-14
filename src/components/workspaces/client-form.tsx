"use client";

import { useState, useTransition } from "react";
import { createClient, updateClient } from "@/actions/client-actions";
import { Button } from "@/components/ui/button";
import { LogoUpload } from "@/components/shared/logo-upload";

const COLOR_PRESETS = [
  { colour: "#92400E", bgColour: "#FEF3C7", label: "Amber" },
  { colour: "#166534", bgColour: "#DCFCE7", label: "Green" },
  { colour: "#1E40AF", bgColour: "#DBEAFE", label: "Blue" },
  { colour: "#7E22CE", bgColour: "#FDF4FF", label: "Purple" },
  { colour: "#9D174D", bgColour: "#FCE7F3", label: "Pink" },
  { colour: "#0F766E", bgColour: "#CCFBF1", label: "Teal" },
  { colour: "#C2410C", bgColour: "#FFEDD5", label: "Orange" },
  { colour: "#4338CA", bgColour: "#E0E7FF", label: "Indigo" },
];

function generateInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.trim().slice(0, 2).toUpperCase();
}

interface ClientFormProps {
  client?: { id: string; name: string; industry: string; colour: string; bgColour: string; initials: string; logo?: string | null } | null;
  onSuccess: () => void;
}

export function ClientForm({ client, onSuccess }: ClientFormProps) {
  const isEdit = !!client;
  const [name, setName] = useState(client?.name ?? "");
  const [industry, setIndustry] = useState(client?.industry ?? "");
  const [initials, setInitials] = useState(client?.initials ?? "");
  const [logo, setLogo] = useState<string | null>(client?.logo ?? null);
  const [colour, setColour] = useState(client?.colour ?? COLOR_PRESETS[0].colour);
  const [bgColour, setBgColour] = useState(client?.bgColour ?? COLOR_PRESETS[0].bgColour);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleNameChange(value: string) {
    setName(value);
    if (!isEdit) {
      setInitials(generateInitials(value));
    }
  }

  function handleSubmit() {
    setError(null);
    startTransition(async () => {
      const formData = new FormData();
      formData.set("name", name);
      formData.set("industry", industry);
      formData.set("colour", colour);
      formData.set("bgColour", bgColour);
      formData.set("initials", initials);
      formData.set("logo", logo ?? "");

      const result = isEdit
        ? await updateClient(client!.id, formData)
        : await createClient(formData);

      if (result.error) {
        setError(result.error);
      } else {
        onSuccess();
      }
    });
  }

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

  return (
    <div style={{ display: "flex", flexDirection: "column" as const, gap: 20 }}>
      {/* Live Preview */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "14px 16px",
          borderRadius: 10,
          backgroundColor: "var(--page-bg)",
          border: "1px solid var(--border-custom)",
        }}
      >
        <div
          style={{
            width: 38,
            height: 38,
            borderRadius: 9,
            backgroundColor: bgColour,
            color: colour,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 13,
            fontWeight: 600,
            flexShrink: 0,
          }}
        >
          {initials || "??"}
        </div>
        <div>
          <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>
            {name || "Client Name"}
          </div>
          <div style={{ fontSize: 11, color: "var(--text-muted-custom)" }}>
            {industry || "Industry"}
          </div>
        </div>
      </div>

      {/* Logo */}
      <LogoUpload
        currentLogo={logo}
        onUpload={(url) => setLogo(url || null)}
      />

      {/* Name */}
      <div>
        <label style={labelStyle}>Name</label>
        <input
          type="text"
          value={name}
          onChange={(e) => handleNameChange(e.target.value)}
          placeholder="Client name"
          style={inputStyle}
        />
      </div>

      {/* Industry */}
      <div>
        <label style={labelStyle}>Industry</label>
        <input
          type="text"
          value={industry}
          onChange={(e) => setIndustry(e.target.value)}
          placeholder="e.g. Technology, Healthcare"
          style={inputStyle}
        />
      </div>

      {/* Initials */}
      <div>
        <label style={labelStyle}>Initials</label>
        <input
          type="text"
          value={initials}
          onChange={(e) => setInitials(e.target.value.toUpperCase().slice(0, 2))}
          maxLength={2}
          placeholder="AB"
          style={{ ...inputStyle, width: 60, textAlign: "center" as const }}
        />
      </div>

      {/* Color Picker */}
      <div>
        <label style={labelStyle}>Color</label>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" as const }}>
          {COLOR_PRESETS.map((preset) => (
            <button
              key={preset.label}
              type="button"
              onClick={() => {
                setColour(preset.colour);
                setBgColour(preset.bgColour);
              }}
              title={preset.label}
              style={{
                width: 30,
                height: 30,
                borderRadius: "50%",
                backgroundColor: preset.bgColour,
                border:
                  colour === preset.colour
                    ? `2px solid ${preset.colour}`
                    : "2px solid var(--border-custom)",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: 0,
              }}
            >
              <div
                style={{
                  width: 14,
                  height: 14,
                  borderRadius: "50%",
                  backgroundColor: preset.colour,
                }}
              />
            </button>
          ))}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div style={{ fontSize: 12, color: "var(--amber)", padding: "8px 10px", borderRadius: 7, backgroundColor: "var(--amber-bg)", border: "1px solid var(--amber-border)" }}>
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
        {isPending ? "Saving..." : isEdit ? "Update Client" : "Create Client"}
      </Button>
    </div>
  );
}
