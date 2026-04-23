"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/ui/icon";
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

export function Sidebar({ clients, badgeCounts, userData: _userData }: SidebarProps) {
  const pathname = usePathname();
  const globalItems = buildGlobalItems(badgeCounts);
  const workspaceItems = buildWorkspaceItems(badgeCounts);

  return (
    <aside
      className="hidden md:flex flex-col shrink-0 self-stretch overflow-y-auto"
      style={{
        width: 240,
        backgroundColor: "var(--sidebar-bg)",
        borderRight: "1px solid var(--border-custom)",
      }}
    >
      {/* Client switcher (brand moved to topbar) */}
      <div className="pt-4 pb-1">
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
    </aside>
  );
}
