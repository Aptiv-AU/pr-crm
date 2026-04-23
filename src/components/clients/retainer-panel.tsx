"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { TextInput } from "@/components/ui/text-input";
import { Icon } from "@/components/ui/icon";
import { SlideOverPanel } from "@/components/shared/slide-over-panel";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import {
  createRetainerPeriod,
  updateRetainerPeriod,
  deleteRetainerPeriod,
} from "@/actions/retainer-actions";
import {
  CADENCE_LABEL,
  CADENCE_SUFFIX,
  formatCurrency,
  monthlyEquivalentCents,
} from "@/lib/retainer";

export interface RetainerPeriodView {
  id: string;
  cadence: "weekly" | "fortnightly" | "monthly";
  amountCents: number;
  startIso: string;
  endIso: string | null;
  note: string | null;
}

interface Props {
  open: boolean;
  onClose: () => void;
  clientId: string;
  clientName: string;
  periods: RetainerPeriodView[];
  currency?: string;
  locale?: string;
}

function toInputDate(iso: string): string {
  return iso.slice(0, 10);
}

function isCurrent(p: RetainerPeriodView, now = new Date()): boolean {
  const start = new Date(p.startIso).getTime();
  const end = p.endIso ? new Date(p.endIso).getTime() : Infinity;
  const t = now.getTime();
  return start <= t && t <= end;
}

function formatRange(startIso: string, endIso: string | null, locale: string): string {
  const start = new Date(startIso);
  const end = endIso ? new Date(endIso) : null;
  const opts: Intl.DateTimeFormatOptions = {
    day: "numeric",
    month: "short",
    year: "numeric",
  };
  const startStr = new Intl.DateTimeFormat(locale, opts).format(start);
  const endStr = end ? new Intl.DateTimeFormat(locale, opts).format(end) : "ongoing";
  return `${startStr} → ${endStr}`;
}

export function RetainerPanel({
  open,
  onClose,
  clientId,
  clientName,
  periods,
  currency = "AUD",
  locale = "en-AU",
}: Props) {
  const router = useRouter();
  const [editingId, setEditingId] = useState<string | "new" | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  function handleEditSuccess() {
    setEditingId(null);
    router.refresh();
  }

  async function handleDelete() {
    if (!deletingId) return;
    await deleteRetainerPeriod(deletingId);
    setDeletingId(null);
    router.refresh();
  }

  return (
    <>
      <SlideOverPanel
        open={open}
        onClose={onClose}
        title={`${clientName} retainer`}
      >
        {editingId ? (
          <PeriodForm
            key={editingId}
            clientId={clientId}
            initial={
              editingId === "new"
                ? null
                : periods.find((p) => p.id === editingId) ?? null
            }
            onCancel={() => setEditingId(null)}
            onSuccess={handleEditSuccess}
          />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div
              style={{
                fontSize: 12,
                color: "var(--text-sub)",
                fontWeight: 500,
                lineHeight: 1.5,
              }}
            >
              Rate changes are modelled as periods. The period covering today
              is what shows on the client header; overlap a range to bill more
              for busy months.
            </div>

            {periods.length === 0 && (
              <div
                style={{
                  padding: "24px 16px",
                  border: "1px dashed var(--border-custom)",
                  borderRadius: 10,
                  textAlign: "center",
                  fontSize: 13,
                  color: "var(--text-sub)",
                }}
              >
                No retainer set. Add a period to start tracking.
              </div>
            )}

            {periods.map((p) => {
              const current = isCurrent(p);
              const monthly = monthlyEquivalentCents(p.cadence, p.amountCents);
              return (
                <div
                  key={p.id}
                  style={{
                    border: `1px solid ${
                      current ? "var(--accent-custom)" : "var(--border-custom)"
                    }`,
                    borderRadius: 10,
                    padding: "12px 14px",
                    background: "var(--card-bg)",
                    boxShadow: current
                      ? "0 0 0 3px color-mix(in srgb, var(--accent-custom) 10%, transparent)"
                      : undefined,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      justifyContent: "space-between",
                    }}
                  >
                    <div
                      style={{
                        fontSize: 15,
                        fontWeight: 800,
                        letterSpacing: "-0.01em",
                      }}
                    >
                      {formatCurrency(p.amountCents, currency, locale)}
                      <span
                        style={{
                          fontSize: 12,
                          fontWeight: 600,
                          color: "var(--text-sub)",
                          marginLeft: 4,
                        }}
                      >
                        {CADENCE_SUFFIX[p.cadence]}
                      </span>
                    </div>
                    <div style={{ display: "flex", gap: 6 }}>
                      {current && (
                        <span
                          style={{
                            fontSize: 10,
                            fontWeight: 700,
                            letterSpacing: "0.1em",
                            textTransform: "uppercase",
                            padding: "3px 8px",
                            borderRadius: 999,
                            background: "var(--accent-custom)",
                            color: "#fff",
                            alignSelf: "center",
                          }}
                        >
                          Current
                        </span>
                      )}
                      <IconButton
                        icon="edit"
                        label="Edit"
                        onClick={() => setEditingId(p.id)}
                      />
                      <IconButton
                        icon="close"
                        label="Delete"
                        onClick={() => setDeletingId(p.id)}
                      />
                    </div>
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      color: "var(--text-sub)",
                      marginTop: 4,
                      fontWeight: 500,
                    }}
                  >
                    {CADENCE_LABEL[p.cadence]} ·{" "}
                    {formatCurrency(monthly, currency, locale)}/mo equivalent
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      color: "var(--text-muted-custom)",
                      marginTop: 2,
                      fontFamily: "var(--font-mono)",
                    }}
                  >
                    {formatRange(p.startIso, p.endIso, locale)}
                  </div>
                  {p.note && (
                    <div
                      style={{
                        fontSize: 12,
                        color: "var(--text-sub)",
                        fontStyle: "italic",
                        marginTop: 6,
                      }}
                    >
                      {p.note}
                    </div>
                  )}
                </div>
              );
            })}

            <Button
              variant="outline"
              size="sm"
              icon="plus"
              onClick={() => setEditingId("new")}
            >
              Add period
            </Button>
          </div>
        )}
      </SlideOverPanel>

      {deletingId && (
        <ConfirmDialog
          title="Delete this period?"
          body="The period will be removed. If it's the current one, the retainer stat will fall back to any other covering period."
          confirmLabel="Delete"
          onConfirm={handleDelete}
          onCancel={() => setDeletingId(null)}
        />
      )}
    </>
  );
}

function IconButton({
  icon,
  label,
  onClick,
}: {
  icon: "edit" | "close";
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      style={{
        width: 28,
        height: 28,
        borderRadius: 6,
        border: "1px solid var(--border-custom)",
        background: "var(--card-bg)",
        color: "var(--text-sub)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
      }}
    >
      <Icon name={icon} size={12} />
    </button>
  );
}

function PeriodForm({
  clientId,
  initial,
  onCancel,
  onSuccess,
}: {
  clientId: string;
  initial: RetainerPeriodView | null;
  onCancel: () => void;
  onSuccess: () => void;
}) {
  const [cadence, setCadence] = useState<"weekly" | "fortnightly" | "monthly">(
    initial?.cadence ?? "monthly"
  );
  const [amount, setAmount] = useState<string>(
    initial ? String(initial.amountCents / 100) : ""
  );
  const [startDate, setStartDate] = useState<string>(
    initial ? toInputDate(initial.startIso) : toInputDate(new Date().toISOString())
  );
  const [endDate, setEndDate] = useState<string>(
    initial?.endIso ? toInputDate(initial.endIso) : ""
  );
  const [note, setNote] = useState<string>(initial?.note ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setError(null);
    setSaving(true);
    const fd = new FormData();
    fd.set("cadence", cadence);
    fd.set("amount", amount);
    fd.set("startDate", startDate);
    fd.set("endDate", endDate);
    fd.set("note", note);
    const result = initial
      ? await updateRetainerPeriod(initial.id, fd)
      : await createRetainerPeriod(clientId, fd);
    setSaving(false);
    if ("error" in result) {
      setError(result.error);
      return;
    }
    onSuccess();
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <Field label="Cadence">
        <div style={{ display: "flex", gap: 6 }}>
          {(["weekly", "fortnightly", "monthly"] as const).map((c) => {
            const on = cadence === c;
            return (
              <button
                key={c}
                type="button"
                onClick={() => setCadence(c)}
                style={{
                  flex: 1,
                  height: 34,
                  borderRadius: 8,
                  border: `1px solid ${
                    on ? "var(--accent-custom)" : "var(--border-custom)"
                  }`,
                  background: on ? "var(--active-bg)" : "var(--card-bg)",
                  color: on ? "var(--accent-custom)" : "var(--text-primary)",
                  fontWeight: on ? 700 : 500,
                  fontSize: 12,
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                {CADENCE_LABEL[c]}
              </button>
            );
          })}
        </div>
      </Field>

      <Field label={`Amount (${CADENCE_LABEL[cadence].toLowerCase()})`}>
        <TextInput
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0"
          inputMode="decimal"
          min="0"
          step="0.01"
        />
      </Field>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <Field label="Start date">
          <TextInput
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </Field>
        <Field label="End date (optional)">
          <TextInput
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </Field>
      </div>

      <Field label="Note (optional)">
        <TextInput
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="e.g. Black Friday uplift"
        />
      </Field>

      {error && (
        <div
          style={{
            fontSize: 12,
            color: "var(--coral)",
            fontWeight: 600,
          }}
        >
          {error}
        </div>
      )}

      <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
        <Button variant="primary" size="sm" onClick={handleSave} disabled={saving}>
          {saving ? "Saving…" : initial ? "Save changes" : "Add period"}
        </Button>
        <Button variant="outline" size="sm" onClick={onCancel} disabled={saving}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <span
        style={{
          fontSize: 10,
          fontWeight: 800,
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          color: "var(--text-muted-custom)",
        }}
      >
        {label}
      </span>
      {children}
    </label>
  );
}
