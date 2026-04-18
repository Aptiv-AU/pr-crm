"use client";

import { useEffect, useState, useTransition } from "react";
import { parseCsvHeader, parseCsvRows } from "@/lib/import/csv-parser";
import {
  CONTACT_IMPORT_FIELDS,
  mapRowsToContacts,
  type ContactImportMapping,
  type MappedContact,
} from "@/lib/import/contact-import";
import {
  importContacts,
  previewContactDedup,
  type DedupPreviewMatch,
} from "@/actions/import-actions";

type Step = "upload" | "map" | "preview" | "importing" | "done";

// Per-row decision: "merge" reuses an existing contact id; "create" forces a
// new contact even if dedup found a candidate. Email matches default to
// "merge"; fuzzy-name-outlet matches default to "create" (highlighted).
type RowDecision =
  | { kind: "create" }
  | { kind: "merge"; matchId: string };

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

  function runImport(decisions: Record<number, RowDecision>) {
    const { valid } = mapRowsToContacts(rows, mapping);
    const forceCreateIndices: number[] = [];
    const forceMergeMap: Record<number, string> = {};
    for (const [k, d] of Object.entries(decisions)) {
      const idx = Number(k);
      if (d.kind === "create") forceCreateIndices.push(idx);
      else forceMergeMap[idx] = d.matchId;
    }

    setStep("importing");
    startTransition(async () => {
      const res = await importContacts(valid, forceCreateIndices, forceMergeMap);
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
          maxWidth: 720,
          width: "calc(100% - 32px)",
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
              <li>Updated (merged into existing): {result.updated}</li>
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
  onConfirm: (decisions: Record<number, RowDecision>) => void;
}) {
  const { valid, skipped } = mapRowsToContacts(rows, mapping);
  const [matches, setMatches] = useState<DedupPreviewMatch[] | null>(null);
  const [tooLargeForFuzzy, setTooLargeForFuzzy] = useState(false);
  const [matchError, setMatchError] = useState<string | null>(null);
  // Per-row decisions; keys are indices into `valid`. Rows without a match
  // are implicit "create" and don't need a key.
  const [decisions, setDecisions] = useState<Record<number, RowDecision>>({});

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await previewContactDedup(valid);
      if (cancelled) return;
      if ("error" in res) {
        setMatchError(res.error);
        setMatches([]);
        return;
      }
      setMatches(res.matches);
      setTooLargeForFuzzy(Boolean(res.tooLargeForFuzzy));
      // Initialise defaults: merge for email, create-new (highlighted) for fuzzy.
      const initial: Record<number, RowDecision> = {};
      for (const m of res.matches) {
        initial[m.incomingIndex] =
          m.reason === "email"
            ? { kind: "merge", matchId: m.matchId }
            : { kind: "create" };
      }
      setDecisions(initial);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const matchByIdx = new Map<number, DedupPreviewMatch>();
  if (matches) for (const m of matches) matchByIdx.set(m.incomingIndex, m);

  const previewRows = valid.slice(0, 20);
  const emailMatches = matches?.filter((m) => m.reason === "email").length ?? 0;
  const fuzzyMatches = matches?.filter((m) => m.reason === "fuzzy-name-outlet").length ?? 0;

  return (
    <div>
      <p style={{ fontSize: 13, color: "var(--text-primary)", marginBottom: 8 }}>
        Ready to import <strong>{valid.length}</strong> contacts.
        {skipped.length > 0 && <> Skipping {skipped.length}.</>}
      </p>
      {matches === null ? (
        <p style={{ fontSize: 12, color: "var(--text-sub)", marginBottom: 12 }}>
          Checking for duplicates…
        </p>
      ) : (
        <p style={{ fontSize: 12, color: "var(--text-sub)", marginBottom: 12 }}>
          {emailMatches} exact email match{emailMatches === 1 ? "" : "es"} ·{" "}
          {fuzzyMatches} possible name match{fuzzyMatches === 1 ? "" : "es"} (review)
        </p>
      )}
      {tooLargeForFuzzy && (
        <p style={{ fontSize: 12, color: "var(--text-sub)", marginBottom: 8 }}>
          Fuzzy matching skipped — too many contacts. Email matches still apply.
        </p>
      )}
      {matchError && (
        <p style={{ fontSize: 12, color: "#ef4444", marginBottom: 8 }}>{matchError}</p>
      )}
      <div style={{ overflowX: "auto" }}>
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
              <th style={thStyle}>Match</th>
              <th style={thStyle}>Action</th>
            </tr>
          </thead>
          <tbody>
            {previewRows.map((r, i) => {
              const m = matchByIdx.get(i);
              const decision = decisions[i];
              const isFuzzy = m?.reason === "fuzzy-name-outlet";
              return (
                <tr
                  key={i}
                  style={
                    isFuzzy
                      ? {
                          // Highlight fuzzy rows so the user notices them.
                          backgroundColor: "rgba(234, 179, 8, 0.08)",
                        }
                      : undefined
                  }
                >
                  <td style={tdStyle}>{r.name}</td>
                  <td style={tdStyle}>{r.email ?? "—"}</td>
                  <td style={tdStyle}>{r.outlet ?? "—"}</td>
                  <td style={tdStyle}>
                    {m ? (
                      <span
                        style={{
                          fontSize: 12,
                          color: isFuzzy ? "#ca8a04" : "var(--text-sub)",
                        }}
                      >
                        {isFuzzy ? "Possibly: " : "Email: "}
                        {m.existing.name}
                        {m.existing.outlet ? ` (${m.existing.outlet})` : ""}
                      </span>
                    ) : (
                      <span style={{ fontSize: 12, color: "var(--text-sub)" }}>—</span>
                    )}
                  </td>
                  <td style={tdStyle}>
                    {m ? (
                      <select
                        value={decision?.kind ?? "create"}
                        onChange={(e) => {
                          const kind = e.target.value as "merge" | "create";
                          setDecisions((d) => ({
                            ...d,
                            [i]:
                              kind === "merge"
                                ? { kind: "merge", matchId: m.matchId }
                                : { kind: "create" },
                          }));
                        }}
                        style={selectStyle}
                      >
                        <option value="merge">Merge into existing</option>
                        <option value="create">Create new</option>
                      </select>
                    ) : (
                      <span style={{ fontSize: 12, color: "var(--text-sub)" }}>
                        Create
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {valid.length > previewRows.length && (
        <p style={{ fontSize: 12, color: "var(--text-sub)", marginTop: 8 }}>
          Showing first {previewRows.length} of {valid.length}. Decisions for
          rows beyond this preview use the defaults shown above (email →
          merge, fuzzy → create new).
        </p>
      )}
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, paddingTop: 16 }}>
        <button type="button" onClick={onBack} style={buttonSecondary}>
          Back
        </button>
        <button
          type="button"
          onClick={() => onConfirm(decisions)}
          style={buttonPrimary}
          disabled={matches === null}
        >
          Import
        </button>
      </div>
    </div>
  );
}

// Suppress unused-import warning for MappedContact in environments where
// types tree-shake aggressively; this keeps the runtime API clean.
export type { MappedContact };

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
  verticalAlign: "top",
};

const selectStyle: React.CSSProperties = {
  padding: "4px 6px",
  fontSize: 12,
  borderRadius: 4,
  border: "1px solid var(--border-custom)",
  backgroundColor: "var(--card-bg)",
  color: "var(--text-primary)",
};
