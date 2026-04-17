"use client";

import { useState, useTransition } from "react";
import { createContact, updateContact } from "@/actions/contact-actions";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { TextInput, Textarea } from "@/components/ui/text-input";

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

interface ContactFormProps {
  contact?: {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
    publication: string;
    beat: string;
    tier: string;
    health: string;
    initials: string;
    avatarBg: string;
    avatarFg: string;
    instagram: string | null;
    twitter: string | null;
    linkedin: string | null;
    notes: string | null;
    photo?: string | null;
  } | null;
  onSuccess: () => void;
}

export function ContactForm({ contact, onSuccess }: ContactFormProps) {
  const isEdit = !!contact;
  const [name, setName] = useState(contact?.name ?? "");
  const [publication, setPublication] = useState(contact?.publication ?? "");
  const [beat, setBeat] = useState(contact?.beat ?? "");
  const [tier, setTier] = useState(contact?.tier ?? "A");
  const [initials, setInitials] = useState(contact?.initials ?? "");
  const [avatarFg, setAvatarFg] = useState(contact?.avatarFg ?? COLOR_PRESETS[0].colour);
  const [avatarBg, setAvatarBg] = useState(contact?.avatarBg ?? COLOR_PRESETS[0].bgColour);
  const [email, setEmail] = useState(contact?.email ?? "");
  const [phone, setPhone] = useState(contact?.phone ?? "");
  const [instagram, setInstagram] = useState(contact?.instagram ?? "");
  const [twitter, setTwitter] = useState(contact?.twitter ?? "");
  const [linkedin, setLinkedin] = useState(contact?.linkedin ?? "");
  const [notes, setNotes] = useState(contact?.notes ?? "");
  const [health, setHealth] = useState(contact?.health ?? "warm");
  const [photo, setPhoto] = useState<string | null>(contact?.photo ?? null);
  const [photoUrl, setPhotoUrl] = useState("");
  const [photoUploading, setPhotoUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  async function handlePhotoFile(file: File) {
    setPhotoUploading(true);
    const formData = new FormData();
    formData.set("file", file);
    const res = await fetch("/api/upload", { method: "POST", body: formData });
    const data = await res.json();
    if (data.url) setPhoto(data.url);
    setPhotoUploading(false);
  }

  function handlePhotoUrl() {
    if (!photoUrl.trim()) return;
    setPhoto(photoUrl.trim());
    setPhotoUrl("");
  }

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
      formData.set("publication", publication);
      formData.set("beat", beat);
      formData.set("tier", tier);
      formData.set("initials", initials);
      formData.set("avatarBg", avatarBg);
      formData.set("avatarFg", avatarFg);
      formData.set("email", email);
      formData.set("phone", phone);
      formData.set("instagram", instagram);
      formData.set("twitter", twitter);
      formData.set("linkedin", linkedin);
      formData.set("notes", notes);
      formData.set("photo", photo ?? "");
      if (isEdit) {
        formData.set("health", health);
      }

      const result = isEdit
        ? await updateContact(contact!.id, formData)
        : await createContact(formData);

      if (result.error) {
        setError(result.error);
      } else {
        onSuccess();
      }
    });
  }

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
            width: 30,
            height: 30,
            borderRadius: "50%",
            backgroundColor: avatarBg,
            color: avatarFg,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 10,
            fontWeight: 600,
            flexShrink: 0,
          }}
        >
          {initials || "??"}
        </div>
        <div>
          <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>
            {name || "Contact Name"}
          </div>
          <div style={{ fontSize: 11, color: "var(--text-muted-custom)" }}>
            {publication || "Publication"}
          </div>
        </div>
      </div>

      <Field label="Name">
        <TextInput
          value={name}
          onChange={(e) => handleNameChange(e.target.value)}
          placeholder="Contact name"
        />
      </Field>

      <Field label="Publication">
        <TextInput
          value={publication}
          onChange={(e) => setPublication(e.target.value)}
          placeholder="e.g., Vogue Beauty"
        />
      </Field>

      <Field label="Beat">
        <TextInput
          value={beat}
          onChange={(e) => setBeat(e.target.value)}
          placeholder="e.g., Beauty, Fashion, Lifestyle"
        />
      </Field>

      {/* Tier */}
      <div>
        <div
          style={{
            fontSize: 12,
            fontWeight: 500,
            color: "var(--text-sub)",
            marginBottom: 6,
          }}
        >
          Tier
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {(["A", "B", "C"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTier(t)}
              style={tier === t ? toggleBtnActive : toggleBtnBase}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Profile Photo */}
      <div>
        <div style={{ fontSize: 12, fontWeight: 500, color: "var(--text-sub)", marginBottom: 6 }}>
          Profile Photo
        </div>
        {photo ? (
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
            <img src={photo} alt="Preview" style={{ width: 48, height: 48, borderRadius: "50%", objectFit: "cover" }} />
            <button type="button" onClick={() => setPhoto(null)} style={{ fontSize: 12, color: "var(--text-muted-custom)", background: "none", border: "none", cursor: "pointer" }}>
              Remove
            </button>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <label style={{
              display: "flex", alignItems: "center", gap: 8, padding: "8px 12px",
              border: "1px dashed var(--border-custom)", borderRadius: 8, cursor: "pointer",
              fontSize: 13, color: "var(--text-sub)",
            }}>
              <input
                type="file"
                accept="image/*"
                style={{ display: "none" }}
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handlePhotoFile(f); e.target.value = ""; }}
              />
              {photoUploading ? "Uploading..." : "Upload photo"}
            </label>
            <div style={{ display: "flex", gap: 6 }}>
              <TextInput
                type="url"
                placeholder="Or paste an image URL"
                value={photoUrl}
                onChange={(e) => setPhotoUrl(e.target.value)}
                style={{ flex: 1, backgroundColor: "var(--card-bg)" }}
              />
              <button
                type="button"
                onClick={handlePhotoUrl}
                style={{
                  padding: "8px 12px", fontSize: 12, fontWeight: 500, borderRadius: 8,
                  border: "1px solid var(--border-custom)", backgroundColor: "var(--hover-bg)",
                  color: "var(--text-sub)", cursor: "pointer",
                }}
              >
                Use
              </button>
            </div>
          </div>
        )}
      </div>

      <Field label="Initials">
        <TextInput
          value={initials}
          onChange={(e) => setInitials(e.target.value.toUpperCase().slice(0, 2))}
          maxLength={2}
          placeholder="AB"
          style={{ width: 60, textAlign: "center" }}
        />
      </Field>

      {/* Color Picker */}
      <div>
        <div
          style={{
            fontSize: 12,
            fontWeight: 500,
            color: "var(--text-sub)",
            marginBottom: 6,
          }}
        >
          Color
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" as const }}>
          {COLOR_PRESETS.map((preset) => (
            <button
              key={preset.label}
              type="button"
              onClick={() => {
                setAvatarFg(preset.colour);
                setAvatarBg(preset.bgColour);
              }}
              title={preset.label}
              style={{
                width: 30,
                height: 30,
                borderRadius: "50%",
                backgroundColor: preset.bgColour,
                border:
                  avatarFg === preset.colour
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

      <Field label="Email">
        <TextInput
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="email@example.com"
        />
      </Field>

      <Field label="Phone">
        <TextInput
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="Phone number"
        />
      </Field>

      <Field label="Instagram">
        <TextInput
          value={instagram}
          onChange={(e) => setInstagram(e.target.value)}
          placeholder="@handle"
        />
      </Field>

      <Field label="Twitter">
        <TextInput
          value={twitter}
          onChange={(e) => setTwitter(e.target.value)}
          placeholder="@handle"
        />
      </Field>

      <Field label="LinkedIn">
        <TextInput
          value={linkedin}
          onChange={(e) => setLinkedin(e.target.value)}
          placeholder="URL or handle"
        />
      </Field>

      <Field label="Notes">
        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Additional notes..."
          rows={3}
        />
      </Field>

      {/* Health (edit mode only) */}
      {isEdit && (
        <div>
          <div
            style={{
              fontSize: 12,
              fontWeight: 500,
              color: "var(--text-sub)",
              marginBottom: 6,
            }}
          >
            Health
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            {(["warm", "cool", "cold"] as const).map((h) => (
              <button
                key={h}
                type="button"
                onClick={() => setHealth(h)}
                style={health === h ? toggleBtnActive : toggleBtnBase}
              >
                {h.charAt(0).toUpperCase() + h.slice(1)}
              </button>
            ))}
          </div>
        </div>
      )}

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
        {isPending ? "Saving..." : isEdit ? "Update Contact" : "Create Contact"}
      </Button>
    </div>
  );
}
