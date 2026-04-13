"use client";

import { useState, useTransition, useRef } from "react";
import { createCoverage, updateCoverage } from "@/actions/coverage-actions";
import { Button } from "@/components/ui/button";

interface CoverageFormProps {
  coverage?: {
    id: string;
    publication: string;
    date: string;
    type: string;
    url: string | null;
    mediaValue: number | null;
    attachmentUrl: string | null;
    notes: string | null;
    campaignId: string | null;
    contactId: string | null;
  } | null;
  campaigns: { id: string; name: string }[];
  contacts: { id: string; name: string }[];
  onSuccess: () => void;
}

const COVERAGE_TYPES = ["feature", "mention", "review", "social"] as const;

function todayString() {
  const d = new Date();
  return d.toISOString().split("T")[0];
}

export function CoverageForm({ coverage, campaigns, contacts, onSuccess }: CoverageFormProps) {
  const isEdit = !!coverage;
  const [publication, setPublication] = useState(coverage?.publication ?? "");
  const [date, setDate] = useState(coverage?.date ?? todayString());
  const [type, setType] = useState(coverage?.type ?? "feature");
  const [campaignId, setCampaignId] = useState(coverage?.campaignId ?? "");
  const [contactId, setContactId] = useState(coverage?.contactId ?? "");
  const [url, setUrl] = useState(coverage?.url ?? "");
  const [mediaValue, setMediaValue] = useState(coverage?.mediaValue?.toString() ?? "");
  const [attachmentUrl, setAttachmentUrl] = useState(coverage?.attachmentUrl ?? "");
  const [notes, setNotes] = useState(coverage?.notes ?? "");
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [isPending, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleFileUpload(file: File) {
    setUploading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.set("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (data.error) {
        setError(data.error);
      } else {
        setAttachmentUrl(data.url);
      }
    } catch {
      setError("File upload failed");
    } finally {
      setUploading(false);
    }
  }

  function handleSubmit() {
    setError(null);
    startTransition(async () => {
      const formData = new FormData();
      formData.set("publication", publication);
      formData.set("date", date);
      formData.set("type", type);
      formData.set("campaignId", campaignId);
      formData.set("contactId", contactId);
      formData.set("url", url);
      formData.set("mediaValue", mediaValue);
      formData.set("attachmentUrl", attachmentUrl);
      formData.set("notes", notes);

      const result = isEdit
        ? await updateCoverage(coverage!.id, formData)
        : await createCoverage(formData);

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

  const selectStyle = {
    ...inputStyle,
    appearance: "none" as const,
    backgroundImage:
      "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23999' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E\")",
    backgroundRepeat: "no-repeat",
    backgroundPosition: "right 10px center",
    paddingRight: 30,
  };

  const isImageUrl = (u: string) => /\.(jpg|jpeg|png|gif|webp)(\?|$)/i.test(u);

  return (
    <div style={{ display: "flex", flexDirection: "column" as const, gap: 20 }}>
      {/* Publication */}
      <div>
        <label style={labelStyle}>Publication</label>
        <input
          type="text"
          value={publication}
          onChange={(e) => setPublication(e.target.value)}
          placeholder="e.g., Vogue Australia"
          style={inputStyle}
        />
      </div>

      {/* Date */}
      <div>
        <label style={labelStyle}>Date</label>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          style={inputStyle}
        />
      </div>

      {/* Type */}
      <div>
        <label style={labelStyle}>Type</label>
        <div style={{ display: "flex", gap: 8 }}>
          {COVERAGE_TYPES.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setType(t)}
              style={type === t ? toggleBtnActive : toggleBtnBase}
            >
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Campaign */}
      <div>
        <label style={labelStyle}>Campaign</label>
        <select
          value={campaignId}
          onChange={(e) => setCampaignId(e.target.value)}
          style={selectStyle}
        >
          <option value="">None</option>
          {campaigns.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      {/* Contact */}
      <div>
        <label style={labelStyle}>Contact</label>
        <select
          value={contactId}
          onChange={(e) => setContactId(e.target.value)}
          style={selectStyle}
        >
          <option value="">None</option>
          {contacts.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      {/* URL */}
      <div>
        <label style={labelStyle}>URL</label>
        <input
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://..."
          style={inputStyle}
        />
      </div>

      {/* Media Value */}
      <div>
        <label style={labelStyle}>Media Value</label>
        <div style={{ position: "relative" }}>
          <span
            style={{
              position: "absolute",
              left: 10,
              top: "50%",
              transform: "translateY(-50%)",
              fontSize: 13,
              color: "var(--text-muted-custom)",
              pointerEvents: "none",
            }}
          >
            $
          </span>
          <input
            type="number"
            value={mediaValue}
            onChange={(e) => setMediaValue(e.target.value)}
            placeholder="0.00"
            step="0.01"
            min="0"
            style={{ ...inputStyle, paddingLeft: 22 }}
          />
        </div>
      </div>

      {/* Clipping Upload */}
      <div>
        <label style={labelStyle}>Clipping</label>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,application/pdf"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFileUpload(file);
          }}
          style={{ display: "none" }}
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          style={{
            ...inputStyle,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "var(--text-muted-custom)",
            height: 40,
          }}
        >
          {uploading ? "Uploading..." : "Choose file..."}
        </button>
        {attachmentUrl && (
          <div
            style={{
              marginTop: 8,
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            {isImageUrl(attachmentUrl) ? (
              <img
                src={attachmentUrl}
                alt="Clipping preview"
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 6,
                  objectFit: "cover",
                  border: "1px solid var(--border-custom)",
                }}
              />
            ) : (
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 6,
                  border: "1px solid var(--border-custom)",
                  backgroundColor: "var(--page-bg)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 10,
                  fontWeight: 600,
                  color: "var(--text-sub)",
                }}
              >
                PDF
              </div>
            )}
            <button
              type="button"
              onClick={() => {
                setAttachmentUrl("");
                if (fileInputRef.current) fileInputRef.current.value = "";
              }}
              style={{
                fontSize: 11,
                color: "var(--text-muted-custom)",
                background: "none",
                border: "none",
                cursor: "pointer",
                textDecoration: "underline",
              }}
            >
              Remove
            </button>
          </div>
        )}
      </div>

      {/* Notes */}
      <div>
        <label style={labelStyle}>Notes</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Additional notes..."
          rows={3}
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
        disabled={isPending || uploading}
        style={{ width: "100%" }}
      >
        {isPending ? "Saving..." : isEdit ? "Update Coverage" : "Add Coverage"}
      </Button>
    </div>
  );
}
