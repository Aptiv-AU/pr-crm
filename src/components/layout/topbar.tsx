"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useTheme } from "next-themes";
import { signOut } from "next-auth/react";
import { Icon } from "@/components/ui/icon";
import { TopbarSearch } from "@/components/layout/topbar-search";
import { APP_NAME } from "@/lib/constants";

interface TopbarProps {
  userInitials: string;
  userName: string;
  orgName: string;
  orgLogo?: string | null;
  orgInitials?: string;
  locale?: string;
  timezone?: string;
}

function orgInitialsFromName(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0]!.toUpperCase())
    .slice(0, 2)
    .join("");
}

/**
 * App shell topbar — spans the full window width. Left: wordmark + org
 * chip. Middle: global search. Right: notifications + user pill.
 */
export function Topbar({
  userInitials,
  userName,
  orgName,
  orgLogo,
  orgInitials,
  locale: _locale,
  timezone: _timezone,
}: TopbarProps) {
  const initials = orgInitials || orgInitialsFromName(orgName) || "—";

  return (
    <header
      className="hidden md:flex items-center shrink-0 sticky top-0 z-40"
      style={{
        height: 64,
        padding: "0 24px",
        gap: 20,
        background: "var(--card-bg)",
        borderBottom: "1px solid var(--border-custom)",
      }}
    >
      {/* Left: wordmark + org chip */}
      <div className="flex items-center gap-4 min-w-0 shrink-0">
        <Link
          href="/dashboard"
          className="no-underline"
          aria-label={APP_NAME}
          style={{
            fontSize: 20,
            fontWeight: 800,
            letterSpacing: "-0.02em",
            color: "var(--accent-custom)",
            lineHeight: 1,
          }}
        >
          {APP_NAME.toUpperCase()}
        </Link>
        <span
          aria-hidden
          style={{
            width: 1,
            height: 22,
            background: "var(--border-custom)",
          }}
        />
        <div
          className="flex items-center gap-2.5 min-w-0"
          title={orgName}
          style={{
            maxWidth: 260,
          }}
        >
          {orgLogo ? (
            <img
              src={orgLogo}
              alt={orgName}
              style={{
                height: 26,
                maxWidth: 160,
                width: "auto",
                borderRadius: 4,
                objectFit: "contain",
                flexShrink: 0,
              }}
            />
          ) : (
            <>
              <div
                aria-hidden
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: 6,
                  background: "var(--surface-container-low)",
                  color: "var(--text-sub)",
                  fontSize: 10,
                  fontWeight: 800,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                {initials}
              </div>
              <span
                className="truncate"
                style={{
                  fontSize: 14,
                  fontWeight: 700,
                  letterSpacing: "-0.01em",
                  color: "var(--text-primary)",
                }}
              >
                {orgName}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Middle: search — centered with flexible padding. */}
      <div className="flex-1 flex justify-center min-w-0">
        <TopbarSearch width={440} />
      </div>

      {/* Right: notifications + user */}
      <div className="flex items-center gap-3 shrink-0">
        <button
          type="button"
          title="Notifications"
          className="relative inline-flex items-center justify-center cursor-pointer"
          style={{
            width: 38,
            height: 38,
            borderRadius: 999,
            background: "var(--surface-container-low)",
            border: "none",
          }}
        >
          <Icon name="bell" size={14} color="var(--text-sub)" />
          <span
            aria-hidden
            style={{
              position: "absolute",
              top: 8,
              right: 9,
              width: 7,
              height: 7,
              borderRadius: "50%",
              background: "var(--accent-custom)",
              border: "2px solid var(--surface-container-low)",
            }}
          />
        </button>

        <UserMenu userInitials={userInitials} userName={userName} />
      </div>
    </header>
  );
}

function UserMenu({
  userInitials,
  userName,
}: {
  userInitials: string;
  userName: string;
}) {
  const [open, setOpen] = useState(false);
  const { theme, resolvedTheme, setTheme } = useTheme();
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!wrapperRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const isDark = (theme === "system" ? resolvedTheme : theme) === "dark";

  return (
    <div ref={wrapperRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="inline-flex items-center gap-2.5 cursor-pointer border-none transition-colors"
        style={{
          height: 38,
          padding: "0 10px 0 5px",
          borderRadius: 999,
          background: open ? "var(--surface-container)" : "var(--surface-container-low)",
        }}
      >
        <div
          className="flex items-center justify-center"
          style={{
            width: 28,
            height: 28,
            borderRadius: "50%",
            background: "var(--accent-custom)",
            color: "#fff",
            fontSize: 10,
            fontWeight: 800,
          }}
        >
          {userInitials}
        </div>
        <span
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: "var(--text-primary)",
            lineHeight: 1,
          }}
        >
          {userName}
        </span>
        <Icon name="chevronD" size={11} color="var(--text-muted-custom)" />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 overflow-hidden"
          style={{
            top: "calc(100% + 6px)",
            width: 220,
            borderRadius: 12,
            background: "var(--card-bg)",
            border: "1px solid var(--border-custom)",
            boxShadow: "0 12px 40px rgba(15, 23, 42, 0.18), 0 1px 2px rgba(15, 23, 42, 0.08)",
            zIndex: 60,
            padding: 4,
          }}
        >
          <Link
            href="/settings"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2.5 w-full rounded-md px-3 py-2 no-underline transition-colors"
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: "var(--text-primary)",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "var(--hover-bg)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; }}
          >
            <Icon name="settings" size={14} color="var(--text-sub)" />
            <span>Settings</span>
          </Link>

          <button
            type="button"
            role="menuitem"
            onClick={() => setTheme(isDark ? "light" : "dark")}
            className="flex items-center gap-2.5 w-full rounded-md px-3 py-2 border-none cursor-pointer transition-colors"
            style={{
              background: "transparent",
              fontSize: 13,
              fontWeight: 600,
              color: "var(--text-primary)",
              textAlign: "left",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "var(--hover-bg)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; }}
          >
            <Icon name={isDark ? "sun" : "moon"} size={14} color="var(--text-sub)" />
            <span>{isDark ? "Light mode" : "Dark mode"}</span>
          </button>

          <div
            aria-hidden
            style={{ height: 1, background: "var(--border-custom)", margin: "4px 4px" }}
          />

          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              void signOut({ callbackUrl: "/auth/signin" });
            }}
            className="flex items-center gap-2.5 w-full rounded-md px-3 py-2 border-none cursor-pointer transition-colors"
            style={{
              background: "transparent",
              fontSize: 13,
              fontWeight: 600,
              color: "var(--coral)",
              textAlign: "left",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "var(--hover-bg)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; }}
          >
            <Icon name="back" size={14} color="var(--coral)" />
            <span>Log out</span>
          </button>
        </div>
      )}
    </div>
  );
}
