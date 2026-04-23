"use client";

import { type CSSProperties } from "react";

type BadgeVariant =
  | "default" | "active" | "outreach" | "draft" | "warm" | "cool" | "solid" | "accent"
  | "coral" | "tierA" | "tierB" | "tierC" | "tierD";

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
  coral: {
    color: "var(--coral)",
    backgroundColor: "var(--coral-bg)",
    borderColor: "var(--coral-border)",
  },
  tierA: {
    color: "#7A5A00",
    backgroundColor: "#FFF3C4",
    borderColor: "transparent",
  },
  tierB: {
    color: "#5F5F5F",
    backgroundColor: "#E5E7EB",
    borderColor: "transparent",
  },
  tierC: {
    color: "#7A3A00",
    backgroundColor: "#FBE6D2",
    borderColor: "transparent",
  },
  tierD: {
    color: "#475569",
    backgroundColor: "#F1F5F9",
    borderColor: "transparent",
  },
};

export function Badge({ variant = "default", children, className, style }: BadgeProps) {
  return (
    <span
      className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider inline-flex items-center ${className ?? ""}`}
      style={{ ...variantStyles[variant], ...style }}
    >
      {children}
    </span>
  );
}

export type { BadgeVariant, BadgeProps };
