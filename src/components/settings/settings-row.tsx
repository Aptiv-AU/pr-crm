"use client";

import type { ReactNode } from "react";

interface SettingsRowProps {
  label: string;
  hint?: string;
  children?: ReactNode;
  last?: boolean;
}

export function SettingsRow({ label, hint, children, last }: SettingsRowProps) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 20,
        padding: "16px 20px",
        borderBottom: last ? "none" : "1px solid var(--border-custom)",
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)" }}>
          {label}
        </div>
        {hint && (
          <div
            style={{
              fontSize: 12,
              color: "var(--text-muted-custom)",
              marginTop: 3,
              fontWeight: 500,
            }}
          >
            {hint}
          </div>
        )}
      </div>
      {children !== undefined && <div style={{ flexShrink: 0 }}>{children}</div>}
    </div>
  );
}
