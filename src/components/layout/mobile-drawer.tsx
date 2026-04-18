"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { Icon } from "@/components/ui/icon";
import { Divider } from "@/components/ui/divider";
import { APP_NAME } from "@/lib/constants";
import { ClientSwitcher } from "@/components/clients/client-switcher";
import type { IconName } from "@/components/ui/icon";

interface NavItem {
  label: string;
  icon: IconName;
  href: string;
  badge?: string;
}

interface BadgeCounts {
  contacts: number;
  campaigns: number;
  outreach: number;
}

interface UserData {
  name: string;
  orgName: string;
}

function buildGlobalItems(badgeCounts: BadgeCounts): NavItem[] {
  return [
    { label: "Clients", icon: "workspace", href: "/clients" },
    { label: "Contacts", icon: "contacts", href: "/contacts", badge: badgeCounts.contacts > 0 ? String(badgeCounts.contacts) : undefined },
    { label: "Suppliers", icon: "suppliers", href: "/suppliers" },
    { label: "Coverage", icon: "coverage", href: "/coverage" },
  ];
}

function buildWorkspaceItems(badgeCounts: BadgeCounts): NavItem[] {
  return [
    { label: "Campaigns", icon: "campaigns", href: "/campaigns", badge: badgeCounts.campaigns > 0 ? String(badgeCounts.campaigns) : undefined },
    { label: "Outreach", icon: "outreach", href: "/outreach", badge: badgeCounts.outreach > 0 ? String(badgeCounts.outreach) : undefined },
    { label: "Events", icon: "events", href: "/events" },
  ];
}

function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0].toUpperCase())
    .slice(0, 2)
    .join("");
}

interface MobileDrawerProps {
  open: boolean;
  onClose: () => void;
  clients: { id: string; slug: string; name: string; industry: string; colour: string; bgColour: string; initials: string }[];
  badgeCounts: BadgeCounts;
  userData: UserData;
}

export function MobileDrawer({ open, onClose, clients, badgeCounts, userData }: MobileDrawerProps) {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const globalItems = buildGlobalItems(badgeCounts);
  const workspaceItems = buildWorkspaceItems(badgeCounts);

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

        {/* Client switcher */}
        <div className="pt-4 pb-1">
          <ClientSwitcher clients={clients} />
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
                {item.badge && (
                  <span className="text-[11px] font-normal" style={{ color: "var(--text-muted-custom)" }}>{item.badge}</span>
                )}
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
                {item.badge && (
                  <span className="text-[11px] font-normal" style={{ color: "var(--text-muted-custom)" }}>{item.badge}</span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="px-3 pb-3">
          <Link
            href="/settings"
            className="flex items-center gap-2.5 rounded-md px-2 py-1.5 w-full text-[13px] font-medium no-underline"
            style={{
              backgroundColor: pathname.startsWith("/settings") ? "var(--active-bg)" : "transparent",
              color: pathname.startsWith("/settings") ? "var(--accent-text)" : "var(--text-sub)",
            }}
          >
            <Icon name="settings" size={14} color={pathname.startsWith("/settings") ? "var(--accent-custom)" : "var(--text-sub)"} />
            <span>Settings</span>
          </Link>

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
              {getInitials(userData.name)}
            </div>
            <div>
              <div
                className="text-[13px] font-medium leading-tight"
                style={{ color: "var(--text-primary)" }}
              >
                {userData.name}
              </div>
              <div
                className="text-[11px] leading-tight"
                style={{ color: "var(--text-muted-custom)" }}
              >
                {userData.orgName}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
