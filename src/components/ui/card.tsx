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
      className={`rounded-xl overflow-hidden ${className ?? ""}`}
      style={{
        backgroundColor: "var(--card-bg)",
        boxShadow: "0 1px 2px rgba(15, 23, 42, 0.04)",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export type { CardProps };
