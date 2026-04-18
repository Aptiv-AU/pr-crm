"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { addSuppression, removeSuppression } from "@/actions/suppression-actions";

interface SuppressionRow {
  id: string;
  email: string;
  reason: string;
  note: string | null;
  createdByUserId: string | null;
  createdAt: string;
}

interface Props {
  suppressions: SuppressionRow[];
}

export function SuppressionManager({ suppressions }: Props) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!email.trim()) {
      setError("Email required");
      return;
    }
    startTransition(async () => {
      const res = await addSuppression({
        email,
        reason: "manual",
        note: note.trim() || undefined,
      });
      if ("error" in res && res.error) {
        setError(res.error);
        return;
      }
      setEmail("");
      setNote("");
      router.refresh();
    });
  }

  function handleRemove(id: string) {
    startTransition(async () => {
      await removeSuppression(id);
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-[20px]">
      <form
        onSubmit={handleAdd}
        style={{
          border: "1px solid var(--border-custom)",
          borderRadius: 10,
          padding: 16,
          backgroundColor: "var(--card-bg)",
        }}
      >
        <div
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: "var(--text-primary)",
            marginBottom: 12,
          }}
        >
          Add email to suppression list
        </div>
        <div className="flex flex-col gap-[8px]">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="email@example.com"
            style={{
              padding: "8px 10px",
              fontSize: 13,
              border: "1px solid var(--border-custom)",
              borderRadius: 6,
              backgroundColor: "var(--input-bg, var(--card-bg))",
              color: "var(--text-primary)",
            }}
          />
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Optional note"
            style={{
              padding: "8px 10px",
              fontSize: 13,
              border: "1px solid var(--border-custom)",
              borderRadius: 6,
              backgroundColor: "var(--input-bg, var(--card-bg))",
              color: "var(--text-primary)",
            }}
          />
          {error && (
            <div style={{ fontSize: 12, color: "var(--red, #ef4444)" }}>{error}</div>
          )}
          <div>
            <Button type="submit" variant="primary" size="sm" disabled={isPending}>
              {isPending ? "Adding..." : "Add"}
            </Button>
          </div>
        </div>
      </form>

      <div
        style={{
          border: "1px solid var(--border-custom)",
          borderRadius: 10,
          backgroundColor: "var(--card-bg)",
          overflow: "hidden",
        }}
      >
        {suppressions.length === 0 ? (
          <div
            style={{
              padding: 24,
              textAlign: "center",
              fontSize: 13,
              color: "var(--text-muted-custom)",
            }}
          >
            No suppressed addresses.
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr
                style={{
                  textAlign: "left",
                  fontSize: 11,
                  textTransform: "uppercase",
                  color: "var(--text-muted-custom)",
                  borderBottom: "1px solid var(--border-custom)",
                }}
              >
                <th style={{ padding: "10px 12px" }}>Email</th>
                <th style={{ padding: "10px 12px" }}>Reason</th>
                <th style={{ padding: "10px 12px" }}>Note</th>
                <th style={{ padding: "10px 12px" }}>Added</th>
                <th style={{ padding: "10px 12px", width: 1 }}></th>
              </tr>
            </thead>
            <tbody>
              {suppressions.map((s) => (
                <tr
                  key={s.id}
                  style={{ borderBottom: "1px solid var(--border-custom)" }}
                >
                  <td style={{ padding: "10px 12px", color: "var(--text-primary)" }}>
                    {s.email}
                  </td>
                  <td style={{ padding: "10px 12px", color: "var(--text-sub)" }}>
                    {s.reason}
                  </td>
                  <td style={{ padding: "10px 12px", color: "var(--text-sub)" }}>
                    {s.note ?? ""}
                  </td>
                  <td style={{ padding: "10px 12px", color: "var(--text-muted-custom)" }}>
                    {new Date(s.createdAt).toLocaleDateString("en-AU", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </td>
                  <td style={{ padding: "10px 12px" }}>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemove(s.id)}
                      disabled={isPending}
                    >
                      Remove
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
