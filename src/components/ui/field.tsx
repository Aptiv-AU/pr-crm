"use client";

import type { ReactNode } from "react";

interface FieldProps {
  label: string;
  required?: boolean;
  hint?: string;
  error?: string | null;
  children: ReactNode;
}

const labelStyle = {
  fontSize: 10,
  fontWeight: 800 as const,
  color: "var(--text-muted-custom)",
  marginBottom: 6,
  display: "block" as const,
  textTransform: "uppercase" as const,
  letterSpacing: "0.12em",
};

const hintStyle = {
  fontSize: 11,
  color: "var(--text-muted-custom)",
  marginTop: 4,
};

const errorStyle = {
  fontSize: 11,
  color: "var(--amber)",
  marginTop: 4,
};

export function Field({ label, required, hint, error, children }: FieldProps) {
  return (
    <label style={{ display: "block" }}>
      <span style={labelStyle}>
        {label}
        {required && (
          <span style={{ color: "var(--amber)", marginLeft: 2 }} aria-hidden="true">
            *
          </span>
        )}
      </span>
      {children}
      {hint && !error && <div style={hintStyle}>{hint}</div>}
      {error && <div style={errorStyle}>{error}</div>}
    </label>
  );
}
