"use client";

import { useEffect, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { scheduleOutreach } from "@/actions/outreach-actions";

interface ScheduleModalProps {
  open: boolean;
  outreachId: string;
  initialIso?: string | null;
  onClose: () => void;
  onScheduled?: () => void;
}

function toLocalInputValue(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function ScheduleModal({
  open,
  outreachId,
  initialIso,
  onClose,
  onScheduled,
}: ScheduleModalProps) {
  const [value, setValue] = useState("");
  const [minValue, setMinValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Initialise the datetime fields when the modal opens. We can't compute
  // these during render (Date.now is impure) and we only need them when the
  // modal becomes visible.
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      const now = Date.now();
      setMinValue(toLocalInputValue(new Date(now + 60_000)));
      if (initialIso) {
        const d = new Date(initialIso);
        if (isFinite(+d)) {
          setValue(toLocalInputValue(d));
          return;
        }
      }
      setValue(toLocalInputValue(new Date(now + 60 * 60_000)));
    });
    return () => {
      cancelled = true;
    };
  }, [open, initialIso]);

  if (!open) return null;

  function handleSubmit() {
    setError(null);
    const d = new Date(value);
    if (!isFinite(+d) || d <= new Date()) {
      setError("Pick a time in the future.");
      return;
    }
    startTransition(async () => {
      const res = await scheduleOutreach(outreachId, d.toISOString());
      if ("error" in res) {
        setError(res.error);
        return;
      }
      onScheduled?.();
      onClose();
    });
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
      onClick={() => {
        if (!isPending) onClose();
      }}
    >
      <div
        style={{
          backgroundColor: "var(--card-bg)",
          borderRadius: 12,
          padding: 24,
          maxWidth: 420,
          width: "calc(100% - 32px)",
          margin: "0 16px",
          border: "1px solid var(--border-custom)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            fontSize: 14,
            fontWeight: 600,
            color: "var(--text-primary)",
            marginBottom: 6,
          }}
        >
          Schedule send
        </div>
        <div
          style={{
            fontSize: 12,
            color: "var(--text-sub)",
            marginBottom: 16,
          }}
        >
          Pressroom will send this outreach automatically at the selected time.
        </div>

        <label
          style={{
            display: "block",
            fontSize: 12,
            fontWeight: 500,
            color: "var(--text-sub)",
            marginBottom: 6,
          }}
        >
          Send at
        </label>
        <input
          type="datetime-local"
          value={value}
          min={minValue}
          onChange={(e) => setValue(e.target.value)}
          disabled={isPending}
          style={{
            width: "100%",
            padding: "8px 10px",
            borderRadius: 8,
            border: "1px solid var(--border-custom)",
            backgroundColor: "var(--card-bg)",
            color: "var(--text-primary)",
            fontSize: 13,
            marginBottom: 12,
          }}
        />

        {error && (
          <div
            style={{
              fontSize: 12,
              color: "var(--red, #c0392b)",
              marginBottom: 12,
            }}
          >
            {error}
          </div>
        )}

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <Button variant="default" size="sm" onClick={onClose} disabled={isPending}>
            Cancel
          </Button>
          <Button variant="primary" size="sm" onClick={handleSubmit} disabled={isPending}>
            {isPending ? "Scheduling..." : "Schedule"}
          </Button>
        </div>
      </div>
    </div>
  );
}
