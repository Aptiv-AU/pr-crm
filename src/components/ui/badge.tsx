"use client";

import { type CSSProperties } from "react";

type BadgeVariant = "default" | "active" | "outreach" | "draft" | "warm" | "cool" | "solid" | "accent";

interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
  className?: string;
  style?: CSSProperties;
}

const variantStyles: Record<BadgeVariant, CSSProperties> = {
  default: {
    color: "var(--text-sub)",
    backgroundColor: "var(--page-bg)",
    borderColor: "var(--border-custom)",
  },
  active: {
    color: "var(--green)",
    backgroundColor: "var(--green-bg)",
    borderColor: "var(--green-border)",
  },
  outreach: {
    color: "var(--accent-text)",
    backgroundColor: "var(--accent-bg)",
    borderColor: "var(--accent-border)",
  },
  draft: {
    color: "var(--text-muted-custom)",
    backgroundColor: "var(--page-bg)",
    borderColor: "var(--border-custom)",
  },
  warm: {
    color: "var(--amber)",
    backgroundColor: "var(--amber-bg)",
    borderColor: "var(--amber-border)",
  },
  cool: {
    color: "var(--slate-custom)",
    backgroundColor: "var(--slate-bg)",
    borderColor: "var(--slate-border)",
  },
  solid: {
    color: "#fff",
    backgroundColor: "var(--text-primary)",
    borderColor: "var(--text-primary)",
  },
  accent: {
    color: "#fff",
    backgroundColor: "var(--accent-custom)",
    borderColor: "var(--accent-custom)",
  },
};

export function Badge({ variant = "default", children, className, style }: BadgeProps) {
  return (
    <span
      className={`rounded-[5px] border px-[7px] py-[2px] text-[11px] font-medium inline-flex items-center ${className ?? ""}`}
      style={{ ...variantStyles[variant], ...style }}
    >
      {children}
    </span>
  );
}

export type { BadgeVariant, BadgeProps };
