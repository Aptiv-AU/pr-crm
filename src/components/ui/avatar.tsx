"use client";

import { type CSSProperties } from "react";

interface AvatarProps {
  initials: string;
  bg: string;
  fg: string;
  size?: number;
  className?: string;
  style?: CSSProperties;
}

export function Avatar({ initials, bg, fg, size = 30, className, style }: AvatarProps) {
  return (
    <div
      className={`flex items-center justify-center font-semibold shrink-0 ${className ?? ""}`}
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        backgroundColor: bg,
        color: fg,
        fontSize: size * 0.32,
        lineHeight: 1,
        ...style,
      }}
    >
      {initials}
    </div>
  );
}

export type { AvatarProps };
