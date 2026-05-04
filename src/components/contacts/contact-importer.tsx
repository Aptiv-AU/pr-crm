"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
// P0-6: papaparse (~50 KB) is only needed once the user picks a file —
// import dynamically so it stays out of the main /contacts chunk.
import {
  CONTACT_IMPORT_FIELDS,
  mapRowsToContacts,
  suggestMapping,
  type ContactImportFieldKey,
  type ContactImportMapping,
} from "@/lib/import/contact-import";
import {
  importContacts,
  previewContactDedup,
  type DedupPreviewMatch,
} from "@/actions/import-actions";

type Step = "upload" | "map" | "preview" | "importing" | "done";

type RowDecision =
  | { kind: "create" }
  | { kind: "merge"; matchId: string };

const STEPS: { key: Step; label: string }[] = [
  { key: "upload", label: "Upload" },
  { key: "map", label: "Match columns" },
  { key: "preview", label: "Preview" },
  { key: "done", label: "Done" },
];

export function ContactImporter() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("upload");
  const [fileName, setFileName] = useState<string | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<Record<string, string>[]>([]);
  const [mapping, setMapping] = useState<ContactImportMapping>({});
  const [result, setResult] = useState<{ created: number; updated: number; skipped: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File) {
    setError(null);
    try {
      const text = await file.text();
      const { parseCsvHeader, parseCsvRows } = await import(
        "@/lib/import/csv-parser"
      );
      const hs = parseCsvHeader(text);
      if (hs.length === 0) {
        setError("That file doesn't look like a CSV with a header row.");
        return;
      }
      const rs = parseCsvRows(text);
      setFileName(file.name);
      setHeaders(hs);
      setRows(rs);
      setMapping(suggestMapping(hs));
      setStep("map");
    } catch {
      setError("Couldn't read that file.");
    }
  }

  function reset() {
    setStep("upload");
    setFileName(null);
    setHeaders([]);
    setRows([]);
    setMapping({});
    setResult(null);
    setError(null);
  }

  const visibleStep = step === "importing" ? "preview" : step;

  return (
    <div className="flex flex-col gap-6">
      <StepBar current={visibleStep} />

      {step === "upload" && (
        <UploadStep onFile={handleFile} error={error} />
      )}

      {step === "map" && (
        <MapStep
          fileName={fileName}
          headers={headers}
          rows={rows}
          mapping={mapping}
          setMapping={setMapping}
          error={error}
          setError={setError}
          onBack={reset}
          onNext={() => {
            const { valid, skipped } = mapRowsToContacts(rows, mapping);
            if (valid.length === 0) {
              setError(`No valid rows to import — ${skipped.length} skipped.`);
              return;
            }
            setError(null);
            setStep("preview");
          }}
        />
      )}

      {(step === "preview" || step === "importing") && (
        <PreviewStep
          rows={rows}
          mapping={mapping}
          importing={step === "importing"}
          error={error}
          onBack={() => {
            setError(null);
            setStep("map");
          }}
          onImport={(decisions) => {
            const { valid } = mapRowsToContacts(rows, mapping);
            const forceCreateIndices: number[] = [];
            const forceMergeMap: Record<number, string> = {};
            for (const [k, d] of Object.entries(decisions)) {
              const idx = Number(k);
              if (d.kind === "create") forceCreateIndices.push(idx);
              else forceMergeMap[idx] = d.matchId;
            }
            setStep("importing");
            (async () => {
              const res = await importContacts(valid, forceCreateIndices, forceMergeMap);
              if ("error" in res) {
                setError(res.error);
                setStep("preview");
              } else {
                setResult({ created: res.created, updated: res.updated, skipped: res.skipped });
                setStep("done");
                router.refresh();
              }
            })();
          }}
        />
      )}

      {step === "done" && result && (
        <DoneStep result={result} onAgain={reset} />
      )}
    </div>
  );
}

// --- Step bar ---------------------------------------------------------------

function StepBar({ current }: { current: Step }) {
  const currentIdx = STEPS.findIndex((s) => s.key === current);
  return (
    <div
      className="flex items-center gap-3 rounded-2xl px-4 py-3"
      style={{
        backgroundColor: "var(--card-bg)",
        border: "1px solid var(--border-custom)",
      }}
    >
      {STEPS.map((s, i) => {
        const isActive = i === currentIdx;
        const isDone = i < currentIdx;
        return (
          <div key={s.key} className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span
                className="flex items-center justify-center rounded-full text-[11px] font-bold"
                style={{
                  width: 22,
                  height: 22,
                  backgroundColor: isActive || isDone ? "var(--accent-custom)" : "var(--surface-container)",
                  color: isActive || isDone ? "#fff" : "var(--text-muted-custom)",
                }}
              >
                {isDone ? "✓" : i + 1}
              </span>
              <span
                className="text-[12px] font-semibold uppercase tracking-[0.08em]"
                style={{
                  color: isActive ? "var(--text-primary)" : "var(--text-muted-custom)",
                }}
              >
                {s.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <span
                style={{
                  width: 28,
                  height: 1,
                  backgroundColor: "var(--border-custom)",
                }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// --- Upload step ------------------------------------------------------------

function UploadStep({ onFile, error }: { onFile: (f: File) => void; error: string | null }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  return (
    <div className="flex flex-col gap-4">
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          const f = e.dataTransfer.files?.[0];
          if (f) onFile(f);
        }}
        role="button"
        tabIndex={0}
        className="cursor-pointer rounded-2xl flex flex-col items-center justify-center gap-3 transition-colors"
        style={{
          padding: "56px 24px",
          border: `2px dashed ${dragging ? "var(--accent-custom)" : "var(--border-custom)"}`,
          backgroundColor: dragging ? "var(--accent-bg)" : "var(--card-bg)",
        }}
      >
        <div
          className="flex items-center justify-center rounded-full"
          style={{
            width: 48,
            height: 48,
            backgroundColor: "var(--surface-container)",
          }}
        >
          <Icon name="upload" size={20} color="var(--text-sub)" />
        </div>
        <div className="flex flex-col items-center gap-1">
          <span className="text-[15px] font-bold" style={{ color: "var(--text-primary)" }}>
            Drop a CSV file here
          </span>
          <span className="text-[13px]" style={{ color: "var(--text-sub)" }}>
            or click to browse your computer
          </span>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])}
        />
      </div>

      {error && <ErrorBanner message={error} />}

      <p className="text-[12px]" style={{ color: "var(--text-muted-custom)" }}>
        Expected columns like <em>Name</em>, <em>Email</em>, <em>Publication</em>, <em>Beat</em>, <em>Instagram</em>. We&apos;ll do our best to match them automatically — you can adjust on the next step.
      </p>
    </div>
  );
}

// --- Map step ---------------------------------------------------------------

function MapStep({
  fileName,
  headers,
  rows,
  mapping,
  setMapping,
  error,
  setError,
  onBack,
  onNext,
}: {
  fileName: string | null;
  headers: string[];
  rows: Record<string, string>[];
  mapping: ContactImportMapping;
  setMapping: (m: ContactImportMapping) => void;
  error: string | null;
  setError: (e: string | null) => void;
  onBack: () => void;
  onNext: () => void;
}) {
  const firstRow = rows[0] ?? {};
  const rowCount = rows.length;
  const mappedCount = Object.values(mapping).filter(Boolean).length;
  const unmapped = headers.filter((h) => !Object.values(mapping).includes(h));

  const matchedRows = useMemo(() => {
    return mapRowsToContacts(rows, mapping);
  }, [rows, mapping]);

  return (
    <div className="flex flex-col gap-4">
      {/* File summary */}
      <div
        className="flex items-center justify-between rounded-2xl px-4 py-3"
        style={{
          backgroundColor: "var(--card-bg)",
          border: "1px solid var(--border-custom)",
        }}
      >
        <div className="flex items-center gap-3">
          <div
            className="flex items-center justify-center rounded-lg"
            style={{
              width: 36,
              height: 36,
              backgroundColor: "var(--accent-bg)",
              color: "var(--accent-text)",
            }}
          >
            <Icon name="file" size={16} />
          </div>
          <div className="flex flex-col">
            <span className="text-[13px] font-bold" style={{ color: "var(--text-primary)" }}>
              {fileName ?? "Uploaded file"}
            </span>
            <span className="text-[12px]" style={{ color: "var(--text-sub)" }}>
              {rowCount} row{rowCount === 1 ? "" : "s"} · {mappedCount} of {CONTACT_IMPORT_FIELDS.length} Pressroom fields mapped
            </span>
          </div>
        </div>
        <button
          type="button"
          onClick={onBack}
          className="text-[12px] font-semibold underline-offset-2 hover:underline"
          style={{ color: "var(--text-sub)", border: "none", background: "transparent", cursor: "pointer" }}
        >
          Use a different file
        </button>
      </div>

      <div
        className="rounded-2xl overflow-hidden"
        style={{
          backgroundColor: "var(--card-bg)",
          border: "1px solid var(--border-custom)",
        }}
      >
        {/* Column header */}
        <div
          className="grid gap-4 px-5 py-3 text-[10px] font-bold uppercase tracking-[0.14em]"
          style={{
            gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1.2fr) minmax(0, 1.5fr)",
            backgroundColor: "var(--surface-container-low)",
            color: "var(--text-muted-custom)",
            borderBottom: "1px solid var(--border-custom)",
          }}
        >
          <span>Pressroom field</span>
          <span>CSV column</span>
          <span>Sample value</span>
        </div>

        {CONTACT_IMPORT_FIELDS.map((field, i) => {
          const selected = mapping[field.key];
          const sample = selected ? firstRow[selected] : "";
          return (
            <div
              key={field.key}
              className="grid gap-4 px-5 py-3 items-center"
              style={{
                gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1.2fr) minmax(0, 1.5fr)",
                borderBottom:
                  i === CONTACT_IMPORT_FIELDS.length - 1
                    ? "none"
                    : "1px solid var(--border-custom)",
              }}
            >
              <div className="flex flex-col gap-0.5 min-w-0">
                <span className="text-[13px] font-bold" style={{ color: "var(--text-primary)" }}>
                  {field.label}
                  {field.required && (
                    <span style={{ color: "var(--coral, #A43A3A)" }}> *</span>
                  )}
                </span>
                {field.hint && (
                  <span className="text-[11px]" style={{ color: "var(--text-muted-custom)" }}>
                    {field.hint}
                  </span>
                )}
              </div>
              <select
                value={selected ?? ""}
                onChange={(e) => {
                  setError(null);
                  const v = e.target.value || undefined;
                  setMapping({ ...mapping, [field.key]: v });
                }}
                className="w-full text-[13px] font-medium"
                style={{
                  height: 36,
                  padding: "0 12px",
                  borderRadius: 10,
                  border: "1px solid var(--border-custom)",
                  backgroundColor: "var(--card-bg)",
                  color: selected ? "var(--text-primary)" : "var(--text-muted-custom)",
                  outline: "none",
                }}
              >
                <option value="">— not mapped —</option>
                {headers.map((h) => (
                  <option key={h} value={h}>
                    {h}
                  </option>
                ))}
              </select>
              <span
                className="text-[13px] truncate"
                style={{
                  color: sample ? "var(--text-primary)" : "var(--text-muted-custom)",
                  fontStyle: sample ? "normal" : "italic",
                }}
                title={sample || undefined}
              >
                {sample || "—"}
              </span>
            </div>
          );
        })}
      </div>

      {unmapped.length > 0 && (
        <details
          className="rounded-2xl px-4 py-3 text-[12px]"
          style={{
            backgroundColor: "var(--surface-container-low)",
            border: "1px solid var(--border-custom)",
            color: "var(--text-sub)",
          }}
        >
          <summary className="cursor-pointer font-semibold" style={{ color: "var(--text-primary)" }}>
            {unmapped.length} CSV column{unmapped.length === 1 ? "" : "s"} will be ignored
          </summary>
          <div className="pt-2 flex flex-wrap gap-1.5">
            {unmapped.map((h) => (
              <span
                key={h}
                className="rounded-full px-2 py-0.5 text-[11px] font-medium"
                style={{
                  backgroundColor: "var(--surface-container)",
                  color: "var(--text-muted-custom)",
                }}
              >
                {h}
              </span>
            ))}
          </div>
        </details>
      )}

      {error && <ErrorBanner message={error} />}

      <div className="flex items-center justify-between gap-3">
        <span className="text-[12px]" style={{ color: "var(--text-sub)" }}>
          <strong style={{ color: "var(--text-primary)" }}>{matchedRows.valid.length}</strong> rows ready ·{" "}
          {matchedRows.skipped.length > 0
            ? `${matchedRows.skipped.length} will be skipped (missing name)`
            : "no rows will be skipped"}
        </span>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={onBack}>
            Back
          </Button>
          <Button variant="primary" size="sm" onClick={onNext} disabled={!mapping.name}>
            Preview import
          </Button>
        </div>
      </div>
    </div>
  );
}

// --- Preview step -----------------------------------------------------------

function PreviewStep({
  rows,
  mapping,
  importing,
  error,
  onBack,
  onImport,
}: {
  rows: Record<string, string>[];
  mapping: ContactImportMapping;
  importing: boolean;
  error: string | null;
  onBack: () => void;
  onImport: (decisions: Record<number, RowDecision>) => void;
}) {
  const { valid, skipped } = useMemo(() => mapRowsToContacts(rows, mapping), [rows, mapping]);
  const [matches, setMatches] = useState<DedupPreviewMatch[] | null>(null);
  const [tooLargeForFuzzy, setTooLargeForFuzzy] = useState(false);
  const [matchError, setMatchError] = useState<string | null>(null);
  const [decisions, setDecisions] = useState<Record<number, RowDecision>>({});
  const [isPending, startTransition] = useTransition();

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

  const previewRows = valid.slice(0, 50);
  const emailMatches = matches?.filter((m) => m.reason === "email").length ?? 0;
  const fuzzyMatches = matches?.filter((m) => m.reason === "fuzzy-name-outlet").length ?? 0;

  return (
    <div className="flex flex-col gap-4">
      {/* Summary */}
      <div
        className="grid gap-3"
        style={{ gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}
      >
        <SummaryTile label="Ready to import" value={valid.length} tone="primary" />
        <SummaryTile label="Email matches" value={emailMatches} tone="muted" hint="default: merge" />
        <SummaryTile label="Possible name matches" value={fuzzyMatches} tone="amber" hint="review each" />
        <SummaryTile label="Skipped" value={skipped.length} tone="muted" hint="missing name" />
      </div>

      {tooLargeForFuzzy && (
        <div className="text-[12px]" style={{ color: "var(--text-sub)" }}>
          Fuzzy matching skipped — too many existing contacts. Email matches still apply.
        </div>
      )}
      {matchError && <ErrorBanner message={matchError} />}

      {/* Table */}
      <div
        className="rounded-2xl overflow-hidden"
        style={{
          backgroundColor: "var(--card-bg)",
          border: "1px solid var(--border-custom)",
        }}
      >
        <div
          className="grid gap-3 px-5 py-3 text-[10px] font-bold uppercase tracking-[0.14em]"
          style={{
            gridTemplateColumns: "minmax(0, 1.3fr) minmax(0, 1.5fr) minmax(0, 1fr) minmax(0, 1.5fr) 180px",
            backgroundColor: "var(--surface-container-low)",
            color: "var(--text-muted-custom)",
            borderBottom: "1px solid var(--border-custom)",
          }}
        >
          <span>Name</span>
          <span>Email</span>
          <span>Outlet</span>
          <span>Match</span>
          <span>Action</span>
        </div>

        {matches === null ? (
          <div className="px-5 py-6 text-[13px]" style={{ color: "var(--text-sub)" }}>
            Checking for duplicates…
          </div>
        ) : (
          previewRows.map((r, i) => {
            const m = matchByIdx.get(i);
            const decision = decisions[i];
            const isFuzzy = m?.reason === "fuzzy-name-outlet";
            return (
              <div
                key={i}
                className="grid gap-3 px-5 py-3 items-center text-[13px]"
                style={{
                  gridTemplateColumns: "minmax(0, 1.3fr) minmax(0, 1.5fr) minmax(0, 1fr) minmax(0, 1.5fr) 180px",
                  borderBottom: i === previewRows.length - 1 ? "none" : "1px solid var(--border-custom)",
                  backgroundColor: isFuzzy ? "rgba(234, 179, 8, 0.06)" : "transparent",
                }}
              >
                <span className="truncate font-semibold" style={{ color: "var(--text-primary)" }} title={r.name}>
                  {r.name}
                </span>
                <span className="truncate" style={{ color: r.email ? "var(--text-primary)" : "var(--text-muted-custom)" }}>
                  {r.email ?? "—"}
                </span>
                <span className="truncate" style={{ color: r.outlet ? "var(--text-primary)" : "var(--text-muted-custom)" }}>
                  {r.outlet ?? "—"}
                </span>
                <span className="truncate" style={{ color: isFuzzy ? "var(--amber)" : "var(--text-sub)" }} title={m?.existing.name}>
                  {m ? (
                    <>
                      {isFuzzy ? "Possibly " : "Email: "}
                      {m.existing.name}
                      {m.existing.outlet ? ` · ${m.existing.outlet}` : ""}
                    </>
                  ) : (
                    "—"
                  )}
                </span>
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
                    className="text-[12px] font-medium"
                    style={{
                      height: 30,
                      padding: "0 10px",
                      borderRadius: 8,
                      border: "1px solid var(--border-custom)",
                      backgroundColor: "var(--card-bg)",
                      color: "var(--text-primary)",
                      outline: "none",
                    }}
                  >
                    <option value="merge">Merge into existing</option>
                    <option value="create">Create new</option>
                  </select>
                ) : (
                  <span className="text-[12px] font-medium" style={{ color: "var(--text-sub)" }}>
                    Create
                  </span>
                )}
              </div>
            );
          })
        )}
      </div>

      {valid.length > previewRows.length && (
        <p className="text-[12px]" style={{ color: "var(--text-muted-custom)" }}>
          Showing first {previewRows.length} of {valid.length}. Rows beyond this preview use the defaults (email → merge, fuzzy → create new).
        </p>
      )}

      {error && <ErrorBanner message={error} />}

      <div className="flex items-center justify-between gap-3">
        <Button variant="ghost" size="sm" onClick={onBack} disabled={importing}>
          Back to mapping
        </Button>
        <Button
          variant="primary"
          size="sm"
          onClick={() =>
            startTransition(() => {
              onImport(decisions);
            })
          }
          disabled={matches === null || importing || isPending || valid.length === 0}
        >
          {importing ? "Importing…" : `Import ${valid.length} contact${valid.length === 1 ? "" : "s"}`}
        </Button>
      </div>
    </div>
  );
}

// --- Done step --------------------------------------------------------------

function DoneStep({
  result,
  onAgain,
}: {
  result: { created: number; updated: number; skipped: number };
  onAgain: () => void;
}) {
  return (
    <div
      className="flex flex-col items-center gap-5 rounded-2xl py-10 px-6 text-center"
      style={{
        backgroundColor: "var(--card-bg)",
        border: "1px solid var(--border-custom)",
      }}
    >
      <div
        className="flex items-center justify-center rounded-full"
        style={{
          width: 56,
          height: 56,
          backgroundColor: "var(--accent-bg)",
          color: "var(--accent-text)",
        }}
      >
        <Icon name="check" size={24} />
      </div>
      <div className="flex flex-col gap-1">
        <span className="text-[22px] font-extrabold tracking-tight" style={{ color: "var(--text-primary)" }}>
          Import complete
        </span>
        <span className="text-[13px]" style={{ color: "var(--text-sub)" }}>
          Created <strong>{result.created}</strong> · merged{" "}
          <strong>{result.updated}</strong> · skipped{" "}
          <strong>{result.skipped}</strong>
        </span>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={onAgain}>
          Import another file
        </Button>
        <Link href="/contacts" className="no-underline">
          <Button variant="primary" size="sm">
            View contacts
          </Button>
        </Link>
      </div>
    </div>
  );
}

// --- Shared helpers ---------------------------------------------------------

function SummaryTile({
  label,
  value,
  tone,
  hint,
}: {
  label: string;
  value: number;
  tone: "primary" | "muted" | "amber";
  hint?: string;
}) {
  const color =
    tone === "primary"
      ? "var(--accent-custom)"
      : tone === "amber"
      ? "var(--amber)"
      : "var(--text-primary)";
  return (
    <div
      className="rounded-2xl px-4 py-3"
      style={{
        backgroundColor: "var(--card-bg)",
        border: "1px solid var(--border-custom)",
      }}
    >
      <div
        className="text-[10px] font-bold uppercase tracking-[0.12em]"
        style={{ color: "var(--text-muted-custom)" }}
      >
        {label}
      </div>
      <div className="text-[24px] font-extrabold tracking-tight" style={{ color }}>
        {value}
      </div>
      {hint && (
        <div className="text-[11px]" style={{ color: "var(--text-muted-custom)" }}>
          {hint}
        </div>
      )}
    </div>
  );
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <div
      className="rounded-xl px-3 py-2 text-[12px] font-medium"
      style={{
        color: "var(--amber)",
        backgroundColor: "var(--amber-bg)",
        border: "1px solid var(--amber-border)",
      }}
    >
      {message}
    </div>
  );
}

export type { ContactImportFieldKey };
