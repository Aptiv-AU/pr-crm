"use client";

import { useState, useTransition } from "react";
import { parseCsvHeader, parseCsvRows } from "@/lib/import/csv-parser";
import {
  CONTACT_IMPORT_FIELDS,
  mapRowsToContacts,
  type ContactImportMapping,
} from "@/lib/import/contact-import";
import { importContacts } from "@/actions/import-actions";

type Step = "upload" | "map" | "preview" | "importing" | "done";

export function ImportContactsModal({
  open,
  onClose,
  onImported,
}: {
  open: boolean;
  onClose: () => void;
  onImported?: () => void;
}) {
  const [step, setStep] = useState<Step>("upload");
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<Record<string, string>[]>([]);
  const [mapping, setMapping] = useState<ContactImportMapping>({});
  const [result, setResult] = useState<{ created: number; updated: number; skipped: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  if (!open) return null;

  async function handleFile(file: File) {
    const text = await file.text();
    const hs = parseCsvHeader(text);
    setHeaders(hs);
    setRows(parseCsvRows(text));
    const autoMapping: ContactImportMapping = {};
    for (const field of CONTACT_IMPORT_FIELDS) {
      const match = hs.find(
        (h) =>
          h.toLowerCase() === field.key.toLowerCase() ||
          h.toLowerCase().replace(/\s/g, "") === field.label.toLowerCase().replace(/\s/g, "")
      );
      if (match) autoMapping[field.key] = match;
    }
    setMapping(autoMapping);
    setStep("map");
  }

  function submitMapping() {
    const { valid, skipped } = mapRowsToContacts(rows, mapping);
    if (valid.length === 0) {
      setError(`No valid rows. ${skipped.length} skipped.`);
      return;
    }
    setError(null);
    setStep("preview");
  }

  function runImport() {
    const { valid } = mapRowsToContacts(rows, mapping);
    setStep("importing");
    startTransition(async () => {
      const res = await importContacts(valid);
      if ("error" in res) {
        setError(res.error);
        setStep("map");
      } else {
        setResult({ created: res.created, updated: res.updated, skipped: res.skipped });
        setStep("done");
        onImported?.();
      }
    });
  }

  function handleClose() {
    setStep("upload");
    setHeaders([]);
    setRows([]);
    setMapping({});
    setResult(null);
    setError(null);
    onClose();
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "var(--overlay)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 50,
      }}
      onClick={handleClose}
    >
      <div
        style={{
          backgroundColor: "var(--card-bg)",
          borderRadius: 12,
          padding: 24,
          maxWidth: 640,
          width: "100%",
          margin: "0 16px",
          border: "1px solid var(--border-custom)",
          maxHeight: "90vh",
          overflowY: "auto",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            fontSize: 16,
            fontWeight: 600,
            color: "var(--text-primary)",
            marginBottom: 16,
          }}
        >
          Import contacts
        </div>

        {step === "upload" && (
          <label
            style={{
              display: "block",
              border: "2px dashed var(--border-custom)",
              borderRadius: 8,
              padding: 32,
              textAlign: "center",
              cursor: "pointer",
              color: "var(--text-sub)",
              fontSize: 13,
            }}
          >
            <input
              type="file"
              accept=".csv,text/csv"
              style={{ display: "none" }}
              onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
            />
            <span>Drop CSV or click to choose</span>
          </label>
        )}

        {step === "map" && (
          <div>
            <p style={{ fontSize: 13, color: "var(--text-sub)", marginBottom: 12 }}>
              Pick which CSV column feeds each Pressroom field. Fields marked * are required.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {CONTACT_IMPORT_FIELDS.map((field) => (
                <div
                  key={field.key}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 12,
                    alignItems: "center",
                  }}
                >
                  <span style={{ fontSize: 13, color: "var(--text-primary)" }}>
                    {field.label}
                    {field.required && <span style={{ color: "#ef4444" }}> *</span>}
                  </span>
                  <select
                    value={mapping[field.key] ?? ""}
                    onChange={(e) =>
                      setMapping({ ...mapping, [field.key]: e.target.value || undefined })
                    }
                    style={{
                      padding: "6px 8px",
                      fontSize: 13,
                      borderRadius: 6,
                      border: "1px solid var(--border-custom)",
                      backgroundColor: "var(--card-bg)",
                      color: "var(--text-primary)",
                    }}
                  >
                    <option value="">— none —</option>
                    {headers.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
            {error && (
              <p style={{ fontSize: 13, color: "#ef4444", marginTop: 12 }}>{error}</p>
            )}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, paddingTop: 16 }}>
              <button
                type="button"
                onClick={() => setStep("upload")}
                style={buttonSecondary}
              >
                Back
              </button>
              <button type="button" onClick={submitMapping} style={buttonPrimary}>
                Preview
              </button>
            </div>
          </div>
        )}

        {step === "preview" && (
          <PreviewStep
            rows={rows}
            mapping={mapping}
            onBack={() => setStep("map")}
            onConfirm={runImport}
          />
        )}

        {step === "importing" && (
          <p style={{ fontSize: 13, color: "var(--text-sub)" }}>Importing {rows.length} rows…</p>
        )}

        {step === "done" && result && (
          <div>
            <p style={{ fontSize: 14, color: "var(--text-primary)", marginBottom: 8 }}>
              Import complete.
            </p>
            <ul style={{ fontSize: 13, color: "var(--text-sub)", marginBottom: 16, paddingLeft: 16 }}>
              <li>Created: {result.created}</li>
              <li>Updated (dedup by email): {result.updated}</li>
              <li>Skipped: {result.skipped}</li>
            </ul>
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button type="button" onClick={handleClose} style={buttonPrimary}>
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function PreviewStep({
  rows,
  mapping,
  onBack,
  onConfirm,
}: {
  rows: Record<string, string>[];
  mapping: ContactImportMapping;
  onBack: () => void;
  onConfirm: () => void;
}) {
  const { valid, skipped } = mapRowsToContacts(rows, mapping);
  const preview = valid.slice(0, 5);
  return (
    <div>
      <p style={{ fontSize: 13, color: "var(--text-primary)", marginBottom: 12 }}>
        Ready to import <strong>{valid.length}</strong> contacts.
        {skipped.length > 0 && <> Skipping {skipped.length}.</>}
      </p>
      <table
        style={{
          width: "100%",
          fontSize: 13,
          borderCollapse: "collapse",
          border: "1px solid var(--border-custom)",
          color: "var(--text-primary)",
        }}
      >
        <thead>
          <tr style={{ backgroundColor: "var(--bg-sub)" }}>
            <th style={thStyle}>Name</th>
            <th style={thStyle}>Email</th>
            <th style={thStyle}>Outlet</th>
          </tr>
        </thead>
        <tbody>
          {preview.map((r, i) => (
            <tr key={i}>
              <td style={tdStyle}>{r.name}</td>
              <td style={tdStyle}>{r.email ?? "—"}</td>
              <td style={tdStyle}>{r.outlet ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, paddingTop: 16 }}>
        <button type="button" onClick={onBack} style={buttonSecondary}>
          Back
        </button>
        <button type="button" onClick={onConfirm} style={buttonPrimary}>
          Import
        </button>
      </div>
    </div>
  );
}

const buttonPrimary: React.CSSProperties = {
  padding: "6px 14px",
  fontSize: 13,
  fontWeight: 500,
  borderRadius: 8,
  border: "none",
  backgroundColor: "var(--accent-custom)",
  color: "#fff",
  cursor: "pointer",
};

const buttonSecondary: React.CSSProperties = {
  padding: "6px 14px",
  fontSize: 13,
  fontWeight: 500,
  borderRadius: 8,
  border: "1px solid var(--border-custom)",
  backgroundColor: "transparent",
  color: "var(--text-sub)",
  cursor: "pointer",
};

const thStyle: React.CSSProperties = {
  padding: 6,
  textAlign: "left",
  borderBottom: "1px solid var(--border-custom)",
  fontWeight: 500,
};

const tdStyle: React.CSSProperties = {
  padding: 6,
  borderBottom: "1px solid var(--border-custom)",
};
