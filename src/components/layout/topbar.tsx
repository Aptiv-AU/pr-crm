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
        className="hidden md:flex items-center justify-between px-6 shrink-0"
        style={{
          height: 52,
          borderBottom: "1px solid var(--border-custom)",
          backgroundColor: "var(--page-bg)",
        }}
      >
        {/* Breadcrumb */}
        <div className="flex items-center gap-1.5 text-sm">
          {isDetail ? (
            <>
              <Link
                href={`/${segments[0]}`}
                className="no-underline font-medium"
                style={{ color: "var(--text-sub)" }}
              >
                {pageTitle}
              </Link>
              <Icon name="chevronR" size={12} color="var(--text-muted-custom)" />
              <span
                className="font-medium"
                style={{ color: "var(--text-primary)" }}
              >
                Detail
              </span>
            </>
          ) : (
            <span
              className="font-semibold"
              style={{ color: "var(--text-primary)" }}
            >
              {pageTitle}
            </span>
          )}
        </div>

        {/* Search placeholder */}
        <button
          onClick={() => window.dispatchEvent(new Event("open-search"))}
          className="flex items-center gap-2 rounded-md px-3 py-1.5 cursor-pointer border-none"
          style={{
            backgroundColor: "var(--card-bg)",
            border: "1px solid var(--border-custom)",
          }}
        >
          <Icon name="search" size={13} color="var(--text-muted-custom)" />
          <span
            className="text-[13px]"
            style={{ color: "var(--text-muted-custom)" }}
          >
            Search...
          </span>
          <span
            className="text-[11px] font-medium rounded px-1.5 py-0.5 ml-4"
            style={{
              backgroundColor: "var(--hover-bg)",
              color: "var(--text-muted-custom)",
            }}
          >
            ⌘K
          </span>
        </button>
      </header>
    </>
  );
}
