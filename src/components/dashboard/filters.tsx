"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition, type CSSProperties } from "react";
import { Field } from "@/components/ui/field";
import { TextInput } from "@/components/ui/text-input";
import { Button } from "@/components/ui/button";

export interface DashboardFiltersProps {
  clients: Array<{ id: string; name: string }>;
  initial: { from?: string; to?: string; clientId?: string };
}

const selectStyle: CSSProperties = {
  width: "100%",
  height: 36,
  padding: "0 12px",
  fontSize: 13,
  borderRadius: 999,
  border: "none",
  backgroundColor: "var(--surface-container-low)",
  color: "var(--text-primary)",
  outline: "none",
};

export function DashboardFilters({ clients, initial }: DashboardFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  // URL is the source of truth: read current values from searchParams (which
  // re-renders this component on push), with the server-provided `initial`
  // as the SSR fallback for first paint.
  const from = searchParams.get("from") ?? initial.from ?? "";
  const to = searchParams.get("to") ?? initial.to ?? "";
  const clientId = searchParams.get("clientId") ?? initial.clientId ?? "";

  function update(next: { from?: string; to?: string; clientId?: string }) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(next)) {
      if (value && value.length > 0) params.set(key, value);
      else params.delete(key);
    }
    const qs = params.toString();
    startTransition(() => {
      router.replace(qs ? `?${qs}` : "?");
    });
  }

  function clearAll() {
    startTransition(() => {
      router.replace("?");
    });
  }

  const hasAny = Boolean(from || to || clientId);

  return (
    <div
      className="flex flex-wrap items-end gap-3 rounded-2xl p-4"
      style={{ backgroundColor: "var(--card-bg)", boxShadow: "0 1px 2px rgba(15, 23, 42, 0.04)" }}
    >
      <div style={{ minWidth: 160 }}>
        <Field label="From">
          <TextInput
            type="date"
            value={from}
            onChange={(e) => update({ from: e.currentTarget.value })}
          />
        </Field>
      </div>
      <div style={{ minWidth: 160 }}>
        <Field label="To">
          <TextInput
            type="date"
            value={to}
            onChange={(e) => update({ to: e.currentTarget.value })}
          />
        </Field>
      </div>
      <div style={{ minWidth: 200, flex: 1 }}>
        <Field label="Client">
          <select
            style={selectStyle}
            value={clientId}
            onChange={(e) => update({ clientId: e.currentTarget.value })}
          >
            <option value="">All clients</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <div style={{ paddingBottom: 0 }}>
        <Button
          variant="ghost"
          size="sm"
          onClick={clearAll}
          disabled={!hasAny}
          aria-label="Clear filters"
        >
          Clear
        </Button>
      </div>
    </div>
  );
}
