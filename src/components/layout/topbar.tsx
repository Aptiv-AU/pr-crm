"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useTheme } from "next-themes";
import { signOut } from "next-auth/react";
import { Icon } from "@/components/ui/icon";

interface TopbarProps {
  userInitials: string;
  userName: string;
  userRole?: string;
}

function getPageTitle(pathname: string): string {
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length === 0) return "Pressroom";
  const section = segments[0];
  return section.charAt(0).toUpperCase() + section.slice(1);
}

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

function formatToday(d: Date): string {
  return `${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

/**
 * Editorial masthead topbar — 76px, accent rule + date eyebrow + large H1,
 * right-aligned search pill / notifications / user chip.
 */
export function Topbar({ userInitials, userName, userRole = "Member" }: TopbarProps) {
  const pathname = usePathname();
  const pageTitle = getPageTitle(pathname);

  const [today, setToday] = useState<string | null>(null);
  useEffect(() => setToday(formatToday(new Date())), []);

  return (
    <header
      className="hidden md:flex items-center justify-between shrink-0 sticky top-0 z-40"
      style={{
        height: 76,
        padding: "0 28px 0 32px",
        gap: 20,
        background: "var(--card-bg)",
        borderBottom: "1px solid var(--border-custom)",
      }}
    >
      <div className="flex items-center gap-4 min-w-0">
        <div
          aria-hidden
          className="rounded-sm shrink-0"
          style={{ width: 3, height: 36, background: "var(--accent-custom)" }}
        />
        <div className="min-w-0">
          <div
            className="flex items-baseline gap-2 uppercase"
            style={{
              fontSize: 9,
              fontWeight: 700,
              letterSpacing: "0.18em",
              color: "var(--text-muted-custom)",
            }}
          >
            <span>Today</span>
            <span style={{ color: "var(--border-mid)" }}>—</span>
            <span
              style={{
                fontFamily: "var(--font-mono)",
                letterSpacing: "0.06em",
                color: "var(--text-sub)",
                textTransform: "none",
                fontWeight: 600,
                fontSize: 10,
              }}
              suppressHydrationWarning
            >
              {today ?? " "}
            </span>
          </div>
          <div
            className="font-extrabold truncate"
            style={{
              fontSize: 22,
              letterSpacing: "-0.02em",
              color: "var(--text-primary)",
              marginTop: 4,
              lineHeight: 1,
              maxWidth: 540,
            }}
          >
            {pageTitle}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 shrink-0">
        <button
          type="button"
          onClick={() => window.dispatchEvent(new Event("open-search"))}
          className="inline-flex items-center gap-2.5 cursor-pointer"
          style={{
            height: 38,
            padding: "0 14px",
            width: 340,
            borderRadius: 999,
            border: "1px solid var(--border-custom)",
            background: "var(--card-bg)",
            boxShadow: "0 1px 2px rgba(15,23,42,0.04)",
          }}
        >
          <Icon name="search" size={13} color="var(--text-sub)" />
          <span
            className="flex-1 text-left"
            style={{
              fontSize: 12,
              fontWeight: 500,
              color: "var(--text-sub)",
            }}
          >
            Search clients, pitches, people…
          </span>
          <kbd
            style={{
              fontSize: 10,
              fontWeight: 700,
              padding: "2px 6px",
              borderRadius: 4,
              background: "var(--surface-container-low)",
              color: "var(--text-muted-custom)",
              fontFamily: "var(--font-mono)",
            }}
          >
            ⌘K
          </kbd>
        </button>

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

        <UserMenu userInitials={userInitials} userName={userName} userRole={userRole} />
      </div>
    </header>
  );
}

function UserMenu({
  userInitials,
  userName,
  userRole,
}: {
  userInitials: string;
  userName: string;
  userRole: string;
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
        <div className="text-left">
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: "var(--text-primary)",
              lineHeight: 1,
            }}
          >
            {userName}
          </div>
          <div
            className="uppercase"
            style={{
              fontSize: 9,
              fontWeight: 600,
              color: "var(--text-muted-custom)",
              marginTop: 2,
              letterSpacing: "0.1em",
            }}
          >
            {userRole}
          </div>
        </div>
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
