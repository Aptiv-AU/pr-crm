"use client";

import { type CSSProperties } from "react";

interface CardProps {
  children: React.ReactNode;
  className?: string;
  style?: CSSProperties;
}

export function Card({ children, className, style }: CardProps) {
  return (
    <div
      className={`rounded-[10px] overflow-hidden ${className ?? ""}`}
      style={{
        border: "1px solid var(--border-custom)",
        backgroundColor: "var(--card-bg)",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export type { CardProps };
