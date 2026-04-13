"use client";

import { type ReactNode, useEffect } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@/components/ui/icon";

interface SlideOverPanelProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}

export function SlideOverPanel({ open, onClose, title, children }: SlideOverPanelProps) {
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  if (typeof window === "undefined") return null;

  return createPortal(
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 100,
          backgroundColor: "var(--overlay)",
          opacity: open ? 1 : 0,
          pointerEvents: open ? "auto" : "none",
          transition: "opacity 240ms cubic-bezier(0.32, 0, 0.15, 1)",
        }}
      />

      {/* Panel */}
      <div
        style={{
          position: "fixed",
          right: 0,
          top: 0,
          bottom: 0,
          zIndex: 101,
          width: "100%",
          maxWidth: 400,
          backgroundColor: "var(--card-bg)",
          borderLeft: "1px solid var(--border-custom)",
          transform: open ? "translateX(0)" : "translateX(100%)",
          transition: "transform 240ms cubic-bezier(0.32, 0, 0.15, 1)",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "16px 20px",
            borderBottom: "1px solid var(--border-custom)",
          }}
        >
          <span
            style={{
              fontSize: 14,
              fontWeight: 600,
              color: "var(--text-primary)",
            }}
          >
            {title}
          </span>
          <button
            onClick={onClose}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 28,
              height: 28,
              borderRadius: 6,
              border: "none",
              backgroundColor: "transparent",
              color: "var(--text-sub)",
              cursor: "pointer",
            }}
          >
            <Icon name="close" size={14} />
          </button>
        </div>

        {/* Content */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "20px",
          }}
        >
          {children}
        </div>
      </div>
    </>,
    document.body
  );
}
