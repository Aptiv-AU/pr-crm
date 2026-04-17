"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  refreshEmailStyle,
  setManualSignature,
} from "@/actions/email-style-actions";

interface Props {
  accountId: string;
  signatureHtml: string | null;
  signatureSource: string | null;
  fontFamily: string | null;
  fontSize: string | null;
  styleResolvedAt: string | null;
}

function sourceLabel(src: string | null): string {
  if (src === "api") return "Provider API";
  if (src === "scraped") return "Scraped from sent items";
  if (src === "manual") return "Manual override";
  if (src === "default") return "Default";
  return "Unresolved";
}

export function EmailStyleManager({
  accountId,
  signatureHtml,
  signatureSource,
  fontFamily,
  fontSize,
  styleResolvedAt,
}: Props) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [html, setHtml] = useState(signatureHtml ?? "");
  const [family, setFamily] = useState(fontFamily ?? "");
  const [size, setSize] = useState(fontSize ?? "");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleRefresh() {
    setError(null);
    startTransition(async () => {
      const res = await refreshEmailStyle(accountId);
      if (res.error) {
        setError(res.error);
        return;
      }
      router.refresh();
    });
  }

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await setManualSignature(accountId, html, family, size);
      if (res.error) {
        setError(res.error);
        return;
      }
      setEditing(false);
      router.refresh();
    });
  }

  return (
    <div style={{ marginTop: 20 }}>
      <div
        className="text-[13px] font-medium"
        style={{ color: "var(--text-primary)", marginBottom: 8 }}
      >
        Signature preview
      </div>
      <div
        style={{
          padding: 14,
          border: "1px solid var(--border-custom, #e5e7eb)",
          borderRadius: 8,
          minHeight: 60,
          background: "var(--bg-panel, #fff)",
        }}
      >
        {signatureHtml ? (
          <div
            style={{
              fontFamily: fontFamily ?? "inherit",
              fontSize: fontSize ?? "inherit",
            }}
            dangerouslySetInnerHTML={{ __html: signatureHtml }}
          />
        ) : (
          <div
            className="text-[12px]"
            style={{ color: "var(--text-muted-custom)" }}
          >
            No signature resolved yet.
          </div>
        )}
      </div>

      <div
        className="text-[12px]"
        style={{ color: "var(--text-sub)", marginTop: 8 }}
      >
        Font: {fontFamily ?? "—"}
        {fontSize ? ` ${fontSize}` : ""} &middot; Source:{" "}
        {sourceLabel(signatureSource)}
        {styleResolvedAt
          ? ` · Resolved ${new Date(styleResolvedAt).toLocaleString("en-AU", {
              day: "numeric",
              month: "short",
              hour: "2-digit",
              minute: "2-digit",
            })}`
          : ""}
      </div>

      <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
        <Button
          type="button"
          onClick={handleRefresh}
          disabled={isPending}
          variant="default"
        >
          {isPending ? "Refreshing…" : "Refresh from mailbox"}
        </Button>
        <Button
          type="button"
          onClick={() => setEditing((v) => !v)}
          disabled={isPending}
          variant="ghost"
        >
          {editing ? "Cancel" : "Edit manually"}
        </Button>
      </div>

      {error && (
        <div
          className="text-[12px]"
          style={{ color: "var(--color-danger, #b91c1c)", marginTop: 8 }}
        >
          {error}
        </div>
      )}

      {editing && (
        <form
          onSubmit={handleSave}
          style={{ marginTop: 16, display: "grid", gap: 10 }}
        >
          <label
            className="text-[12px]"
            style={{ color: "var(--text-sub)", display: "grid", gap: 4 }}
          >
            Signature HTML
            <textarea
              value={html}
              onChange={(e) => setHtml(e.target.value)}
              rows={8}
              style={{
                fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
                fontSize: 12,
                padding: 10,
                borderRadius: 6,
                border: "1px solid var(--border-custom, #d1d5db)",
                background: "var(--bg-panel, #fff)",
                color: "var(--text-primary)",
              }}
              placeholder="<p>—<br>Scott<br>Publicist</p>"
            />
          </label>
          <div style={{ display: "flex", gap: 10 }}>
            <label
              className="text-[12px]"
              style={{ color: "var(--text-sub)", display: "grid", gap: 4, flex: 2 }}
            >
              Font family
              <input
                value={family}
                onChange={(e) => setFamily(e.target.value)}
                placeholder="Arial, sans-serif"
                style={{
                  fontSize: 13,
                  padding: "7px 9px",
                  borderRadius: 6,
                  border: "1px solid var(--border-custom, #d1d5db)",
                  background: "var(--bg-panel, #fff)",
                  color: "var(--text-primary)",
                }}
              />
            </label>
            <label
              className="text-[12px]"
              style={{ color: "var(--text-sub)", display: "grid", gap: 4, flex: 1 }}
            >
              Font size
              <input
                value={size}
                onChange={(e) => setSize(e.target.value)}
                placeholder="13px"
                style={{
                  fontSize: 13,
                  padding: "7px 9px",
                  borderRadius: 6,
                  border: "1px solid var(--border-custom, #d1d5db)",
                  background: "var(--bg-panel, #fff)",
                  color: "var(--text-primary)",
                }}
              />
            </label>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Saving…" : "Save signature"}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
