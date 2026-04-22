"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/ui/icon";

function getPageTitle(pathname: string): string {
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length === 0) return "Home";
  const section = segments[0];
  return section.charAt(0).toUpperCase() + section.slice(1);
}

export function Topbar() {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);
  const pageTitle = getPageTitle(pathname);
  const isDetail = segments.length > 1;

  return (
    <>
      {/* Desktop topbar (hidden on mobile) */}
      <header
        className="hidden md:flex items-center justify-between px-8 shrink-0 sticky top-0 z-40"
        style={{
          height: 64,
          backgroundColor: "var(--card-bg)",
          boxShadow: "0 1px 0 var(--border-custom)",
        }}
      >
        {/* Pill-shaped global search trigger */}
        <button
          onClick={() => window.dispatchEvent(new Event("open-search"))}
          className="flex items-center gap-2.5 rounded-full px-4 py-2 cursor-pointer border-none transition-colors"
          style={{
            backgroundColor: "var(--surface-container-low)",
            width: 320,
          }}
          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "var(--surface-container)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "var(--surface-container-low)"; }}
        >
          <Icon name="search" size={14} color="var(--text-muted-custom)" />
          <span
            className="text-[13px] font-medium flex-1 text-left"
            style={{ color: "var(--text-muted-custom)" }}
          >
            Global search...
          </span>
          <span
            className="text-[10px] font-bold rounded px-1.5 py-0.5"
            style={{
              backgroundColor: "var(--card-bg)",
              color: "var(--text-muted-custom)",
            }}
          >
            ⌘K
          </span>
        </button>

        {/* Page title centered — minimal, lets page headers shine */}
        <div className="flex items-center gap-1.5 text-sm">
          {isDetail && (
            <>
              <Link
                href={`/${segments[0]}`}
                className="no-underline font-semibold"
                style={{ color: "var(--text-sub)" }}
              >
                {pageTitle}
              </Link>
              <Icon name="chevronR" size={12} color="var(--text-muted-custom)" />
              <span className="font-bold" style={{ color: "var(--text-primary)" }}>
                Detail
              </span>
            </>
          )}
        </div>

        {/* Right: placeholder for future notifications/settings slot */}
        <div className="w-[320px]" />
      </header>
    </>
  );
}
