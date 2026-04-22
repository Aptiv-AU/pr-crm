"use client";

import { type CSSProperties, type ButtonHTMLAttributes, type Ref } from "react";
import { Icon, type IconName } from "./icon";

type ButtonVariant = "primary" | "default" | "ghost";
type ButtonSize = "xs" | "sm" | "md";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: IconName;
  children?: React.ReactNode;
  ref?: Ref<HTMLButtonElement>;
}

const variantStyles: Record<ButtonVariant, CSSProperties> = {
  primary: {
    backgroundColor: "var(--accent-custom)",
    color: "#fff",
    border: "1px solid var(--accent-custom)",
  },
  default: {
    backgroundColor: "var(--surface-container-low)",
    color: "var(--text-primary)",
    border: "none",
  },
  ghost: {
    backgroundColor: "transparent",
    color: "var(--text-sub)",
    border: "1px solid transparent",
  },
};

const sizeClasses: Record<ButtonSize, string> = {
  xs: "h-[26px] px-3 text-[11px] font-bold gap-[4px]",
  sm: "h-[32px] px-4 text-[12px] font-bold gap-[5px]",
  md: "h-[38px] px-5 text-[13px] font-bold gap-[6px]",
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
  ref,
  ...props
}: ButtonProps) {
  return (
    <button
      ref={ref}
      className={`inline-flex items-center justify-center rounded-full whitespace-nowrap cursor-pointer transition-opacity hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed ${sizeClasses[size]} ${className ?? ""}`}
      style={{ ...variantStyles[variant], ...style }}
      {...props}
    >
      {icon && <Icon name={icon} size={iconSizes[size]} />}
      {children}
    </button>
  );
}

export type { ButtonVariant, ButtonSize, ButtonProps };
