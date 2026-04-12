"use client";

import { type CSSProperties } from "react";

interface DividerProps {
  className?: string;
  style?: CSSProperties;
}

export function Divider({ className, style }: DividerProps) {
  return (
    <hr
      className={className}
      style={{
        border: "none",
        height: 1,
        backgroundColor: "var(--border-custom)",
        margin: 0,
        ...style,
      }}
    />
  );
}

export type { DividerProps };
