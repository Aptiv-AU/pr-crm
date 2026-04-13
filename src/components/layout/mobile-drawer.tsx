"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { Icon } from "@/components/ui/icon";
import { Divider } from "@/components/ui/divider";
import { APP_NAME } from "@/lib/constants";
import { WorkspaceSwitcher } from "@/components/workspaces/workspace-switcher";
import type { IconName } from "@/components/ui/icon";

interface NavItem {
  label: string;
  icon: IconName;
  href: string;
  badge?: string;
}

const globalItems: NavItem[] = [
  { label: "Workspaces", icon: "workspace", href: "/workspaces" },
  { label: "Contacts", icon: "contacts", href: "/contacts" },
  { label: "Suppliers", icon: "suppliers", href: "/suppliers" },
  { label: "Coverage", icon: "coverage", href: "/coverage" },
];

const workspaceItems: NavItem[] = [
  { label: "Campaigns", icon: "campaigns", href: "/campaigns" },
  { label: "Outreach", icon: "outreach", href: "/outreach" },
  { label: "Events", icon: "events", href: "/events" },
];

interface MobileDrawerProps {
  open: boolean;
  onClose: () => void;
  clients: { id: string; name: string; industry: string; colour: string; bgColour: string; initials: string }[];
}

export function MobileDrawer({ open, onClose, clients }: MobileDrawerProps) {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();

  // Close on route change
  useEffect(() => {
    onClose();
  }, [pathname]); // eslint-disable-line react-hooks/exhaustive-deps

  // Lock body scroll when open
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

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0"
        style={{
          zIndex: 200,
          backgroundColor: "var(--overlay)",
          opacity: open ? 1 : 0,
          pointerEvents: open ? "auto" : "none",
          transition: "opacity 200ms ease",
        }}
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        className="fixed left-0 top-0 h-full flex flex-col"
        style={{
          zIndex: 201,
          width: 260,
          backgroundColor: "var(--sidebar-bg)",
          transform: open ? "translateX(0)" : "translateX(-100%)",
          transition: "transform 250ms ease",
        }}
      >
        {/* Header with close button */}
        <div className="flex items-center justify-between px-4 pt-5 pb-1">
          <div className="flex items-center gap-2.5">
            <div
              className="flex items-center justify-center rounded-lg"
              style={{
                width: 26,
                height: 26,
                backgroundColor: "var(--accent-custom)",
              }}
            >
              <Icon name="sparkle" size={14} color="#fff" />
            </div>
            <div>
              <div
                className="text-sm font-semibold leading-tight"
                style={{ color: "var(--text-primary)" }}
              >
                {APP_NAME}
              </div>
              <div
                className="text-[11px] leading-tight"
                style={{ color: "var(--text-muted-custom)" }}
              >
                Solo workspace
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex items-center justify-center rounded-md p-1 border-none cursor-pointer"
            style={{ backgroundColor: "transparent" }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "var(--hover-bg)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "transparent";
            }}
          >
            <Icon name="close" size={16} color="var(--text-sub)" />
          </button>
        </div>

        {/* Workspace switcher */}
        <div className="pt-4 pb-1">
          <WorkspaceSwitcher clients={clients} />
        </div>

        {/* Nav items */}
        <nav className="flex-1 px-3 pt-2 flex flex-col gap-0.5 overflow-y-auto">
          {/* Directory */}
          <div
            className="px-2 pt-1 pb-1.5 text-[10px] font-semibold uppercase tracking-[0.08em]"
            style={{ color: "var(--text-muted-custom)" }}
          >
            Directory
          </div>
          {globalItems.map((item) => {
            const isActive = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-2.5 rounded-md px-2 py-1.5 text-[13px] font-medium transition-colors no-underline"
                style={{
                  backgroundColor: isActive ? "var(--active-bg)" : "transparent",
                  color: isActive ? "var(--accent-text)" : "var(--text-sub)",
                }}
              >
                <Icon name={item.icon} size={14} color={isActive ? "var(--accent-custom)" : "var(--text-sub)"} />
                <span className="flex-1">{item.label}</span>
              </Link>
            );
          })}

          {/* Workspace */}
          <div
            className="px-2 pt-3 pb-1.5 text-[10px] font-semibold uppercase tracking-[0.08em]"
            style={{ color: "var(--text-muted-custom)" }}
          >
            Workspace
          </div>
          {workspaceItems.map((item) => {
            const isActive = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-2.5 rounded-md px-2 py-1.5 text-[13px] font-medium transition-colors no-underline"
                style={{
                  backgroundColor: isActive ? "var(--active-bg)" : "transparent",
                  color: isActive ? "var(--accent-text)" : "var(--text-sub)",
                }}
              >
                <Icon name={item.icon} size={14} color={isActive ? "var(--accent-custom)" : "var(--text-sub)"} />
                <span className="flex-1">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="px-3 pb-3">
          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="flex items-center gap-2.5 rounded-md px-2 py-1.5 w-full text-[13px] font-medium cursor-pointer border-none"
            style={{
              backgroundColor: "transparent",
              color: "var(--text-sub)",
            }}
          >
            <Icon
              name={theme === "dark" ? "sun" : "moon"}
              size={14}
              color="var(--text-sub)"
            />
            <span>{theme === "dark" ? "Light mode" : "Dark mode"}</span>
          </button>

          <Divider style={{ margin: "8px 0" }} />

          <div className="flex items-center gap-2.5 px-2 py-1.5">
            <div
              className="flex items-center justify-center rounded-full text-[11px] font-semibold text-white"
              style={{
                width: 26,
                height: 26,
                backgroundColor: "#EC4899",
              }}
            >
              NW
            </div>
            <div>
              <div
                className="text-[13px] font-medium leading-tight"
                style={{ color: "var(--text-primary)" }}
              >
                Natalie White
              </div>
              <div
                className="text-[11px] leading-tight"
                style={{ color: "var(--text-muted-custom)" }}
              >
                NWPR
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
