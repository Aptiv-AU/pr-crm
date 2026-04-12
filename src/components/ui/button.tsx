"use client";

import { type CSSProperties, type ButtonHTMLAttributes } from "react";
import { Icon, type IconName } from "./icon";

type ButtonVariant = "primary" | "default" | "ghost";
type ButtonSize = "xs" | "sm" | "md";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: IconName;
  children?: React.ReactNode;
}

const variantStyles: Record<ButtonVariant, CSSProperties> = {
  primary: {
    backgroundColor: "var(--accent-custom)",
    color: "#fff",
    border: "1px solid var(--accent-custom)",
  },
  default: {
    backgroundColor: "var(--card-bg)",
    color: "var(--text-primary)",
    border: "1px solid var(--border-custom)",
  },
  ghost: {
    backgroundColor: "transparent",
    color: "var(--text-sub)",
    border: "1px solid transparent",
  },
};

const sizeClasses: Record<ButtonSize, string> = {
  xs: "h-[26px] px-[8px] text-[11px] gap-[4px]",
  sm: "h-[30px] px-[10px] text-[12px] gap-[5px]",
  md: "h-[34px] px-[14px] text-[13px] gap-[6px]",
};

const iconSizes: Record<ButtonSize, number> = {
  xs: 12,
  sm: 13,
  md: 14,
};

export function Button({
  variant = "default",
  size = "sm",
  icon,
  children,
  className,
  style,
  ...props
}: ButtonProps) {
  return (
    <button
      className={`inline-flex items-center justify-center rounded-[7px] font-medium whitespace-nowrap cursor-pointer transition-opacity hover:opacity-80 disabled:opacity-50 disabled:cursor-not-allowed ${sizeClasses[size]} ${className ?? ""}`}
      style={{ ...variantStyles[variant], ...style }}
      {...props}
    >
      {icon && <Icon name={icon} size={iconSizes[size]} />}
      {children}
    </button>
  );
}

export type { ButtonVariant, ButtonSize, ButtonProps };
