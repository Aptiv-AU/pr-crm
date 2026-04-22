"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { Icon } from "@/components/ui/icon";
import { Divider } from "@/components/ui/divider";
import { APP_NAME } from "@/lib/constants";
import { ClientSwitcher } from "@/components/clients/client-switcher";
import { buildGlobalItems, buildWorkspaceItems, type BadgeCounts, type NavItem as NavDef } from "./nav-items";

interface UserData {
  name: string;
  orgName: string;
}

interface SidebarProps {
  clients: { id: string; slug: string; name: string; industry: string; colour: string; bgColour: string; initials: string }[];
  badgeCounts: BadgeCounts;
  userData: UserData;
}

function SidebarItem({ item, active }: { item: NavDef; active: boolean }) {
  return (
    <Link
      href={item.href}
      className="relative flex items-center gap-2.5 rounded-md px-3 py-2 text-[13px] font-semibold transition-colors no-underline"
      style={{
        backgroundColor: active ? "var(--active-bg)" : "transparent",
        color: active ? "var(--accent-custom)" : "var(--text-sub)",
      }}
      onMouseEnter={(e) => { if (!active) e.currentTarget.style.backgroundColor = "var(--hover-bg)"; }}
      onMouseLeave={(e) => { if (!active) e.currentTarget.style.backgroundColor = "transparent"; }}
    >
      {active && (
        <span
          aria-hidden
          className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-r-full"
          style={{ backgroundColor: "var(--accent-custom)" }}
        />
      )}
      <Icon name={item.icon} size={15} color={active ? "var(--accent-custom)" : "var(--text-sub)"} />
      <span className="flex-1">{item.label}</span>
      {item.badge && (
        <span
          className="text-[11px] font-semibold rounded-full px-1.5"
          style={{
            backgroundColor: active ? "transparent" : "var(--surface-container)",
            color: active ? "var(--accent-custom)" : "var(--text-muted-custom)",
          }}
        >
          {item.badge}
        </span>
      )}
    </Link>
  );
}

function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0].toUpperCase())
    .slice(0, 2)
    .join("");
}

export function Sidebar({ clients, badgeCounts, userData }: SidebarProps) {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const globalItems = buildGlobalItems(badgeCounts);
  const workspaceItems = buildWorkspaceItems(badgeCounts);

  return (
    <aside
      className="hidden md:flex flex-col sticky top-0 h-screen shrink-0"
      style={{
        width: 240,
        backgroundColor: "var(--sidebar-bg)",
      }}
    >
      {/* Wordmark */}
      <div className="px-4 pt-6 pb-2">
        <div
          className="font-extrabold tracking-tight leading-none"
          style={{ color: "var(--accent-custom)", fontSize: 22 }}
        >
          {APP_NAME}
        </div>
        <div
          className="mt-1 text-[10px] font-semibold uppercase tracking-[0.18em]"
          style={{ color: "var(--text-muted-custom)" }}
        >
          Editorial CRM
        </div>
      </div>

      {/* Global search trigger */}
      <div className="px-3 pt-4">
        <button
          onClick={() => window.dispatchEvent(new Event("open-search"))}
          className="w-full flex items-center gap-2.5 rounded-full px-3.5 py-2 cursor-pointer border-none transition-colors"
          style={{ backgroundColor: "var(--card-bg)" }}
          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "var(--surface-container)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "var(--card-bg)"; }}
        >
          <Icon name="search" size={13} color="var(--text-muted-custom)" />
          <span
            className="text-[12px] font-medium flex-1 text-left"
            style={{ color: "var(--text-muted-custom)" }}
          >
            Search
          </span>
          <span
            className="text-[9px] font-bold rounded px-1.5 py-0.5"
            style={{
              backgroundColor: "var(--surface-container)",
              color: "var(--text-muted-custom)",
            }}
          >
            ⌘K
          </span>
        </button>
      </div>

      {/* Client switcher */}
      <div className="pt-3 pb-1">
        <ClientSwitcher clients={clients} />
      </div>

      {/* Nav items */}
      <nav className="flex-1 px-3 pt-2 flex flex-col gap-0.5 overflow-y-auto">
        {/* Global / Directory */}
        <div
          className="px-3 pt-1 pb-1.5 text-[10px] font-semibold uppercase tracking-[0.14em]"
          style={{ color: "var(--text-muted-custom)" }}
        >
          Directory
        </div>
        {globalItems.map((item) => (
          <SidebarItem key={item.href} item={item} active={pathname.startsWith(item.href)} />
        ))}

        {/* Workspace */}
        <div
          className="px-3 pt-4 pb-1.5 text-[10px] font-semibold uppercase tracking-[0.14em]"
          style={{ color: "var(--text-muted-custom)" }}
        >
          Workspace
        </div>
        {workspaceItems.map((item) => (
          <SidebarItem key={item.href} item={item} active={pathname.startsWith(item.href)} />
        ))}
      </nav>

      {/* Footer */}
      <div className="px-3 pb-4">
        <SidebarItem
          item={{ label: "Settings", icon: "settings", href: "/settings" }}
          active={pathname.startsWith("/settings")}
        />

        {/* Theme toggle */}
        <button
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className="flex items-center gap-2.5 rounded-md px-3 py-2 w-full text-[13px] font-semibold cursor-pointer border-none"
          style={{
            backgroundColor: "transparent",
            color: "var(--text-sub)",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "var(--hover-bg)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; }}
        >
          <Icon name={theme === "dark" ? "sun" : "moon"} size={15} color="var(--text-sub)" />
          <span>{theme === "dark" ? "Light mode" : "Dark mode"}</span>
        </button>

        <Divider style={{ margin: "10px 0" }} />

        {/* User row */}
        <div className="flex items-center gap-2.5 px-2 py-1.5">
          <div
            className="flex items-center justify-center rounded-full text-[11px] font-bold"
            style={{
              width: 30,
              height: 30,
              backgroundColor: "var(--accent-custom)",
              color: "#fff",
            }}
          >
            {getInitials(userData.name)}
          </div>
          <div className="min-w-0">
            <div
              className="text-[13px] font-bold leading-tight truncate"
              style={{ color: "var(--text-primary)" }}
            >
              {userData.name}
            </div>
            <div
              className="text-[10px] font-semibold uppercase tracking-[0.08em] leading-tight mt-0.5"
              style={{ color: "var(--text-muted-custom)" }}
            >
              {userData.orgName}
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
