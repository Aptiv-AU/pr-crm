"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { Icon } from "@/components/ui/icon";
import { Divider } from "@/components/ui/divider";
import { APP_NAME } from "@/lib/constants";
import type { IconName } from "@/components/ui/icon";

interface NavItem {
  label: string;
  icon: IconName;
  href: string;
  badge?: string;
}

const navItems: NavItem[] = [
  { label: "Workspaces", icon: "workspace", href: "/workspaces" },
  { label: "Contacts", icon: "contacts", href: "/contacts", badge: "248" },
  { label: "Suppliers", icon: "suppliers", href: "/suppliers" },
  { label: "Campaigns", icon: "campaigns", href: "/campaigns", badge: "6" },
  { label: "Outreach", icon: "outreach", href: "/outreach", badge: "4" },
  { label: "Events", icon: "events", href: "/events" },
  { label: "Coverage", icon: "coverage", href: "/coverage" },
];

export function Sidebar() {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();

  return (
    <aside
      className="hidden md:flex flex-col sticky top-0 h-screen shrink-0"
      style={{
        width: 224,
        backgroundColor: "var(--sidebar-bg)",
        borderRight: "1px solid var(--border-custom)",
      }}
    >
      {/* Logo area */}
      <div className="flex items-center gap-2.5 px-4 pt-5 pb-1">
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

      {/* Workspace switcher placeholder */}
      <div className="px-3 pt-4 pb-1">
        <div
          className="flex items-center gap-2 rounded-md px-2 py-1.5 cursor-default"
          style={{
            backgroundColor: "var(--hover-bg)",
          }}
        >
          <Icon name="workspace" size={14} color="var(--text-sub)" />
          <span
            className="text-[13px] font-medium flex-1"
            style={{ color: "var(--text-primary)" }}
          >
            All clients
          </span>
          <Icon name="chevronD" size={12} color="var(--text-muted-custom)" />
        </div>
      </div>

      {/* Nav items */}
      <nav className="flex-1 px-3 pt-2 flex flex-col gap-0.5">
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-2.5 rounded-md px-2 py-1.5 text-[13px] font-medium transition-colors no-underline"
              style={{
                backgroundColor: isActive
                  ? "var(--active-bg)"
                  : "transparent",
                color: isActive
                  ? "var(--accent-text)"
                  : "var(--text-sub)",
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.backgroundColor = "var(--hover-bg)";
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.backgroundColor = "transparent";
                }
              }}
            >
              <Icon
                name={item.icon}
                size={14}
                color={
                  isActive ? "var(--accent-custom)" : "var(--text-sub)"
                }
              />
              <span className="flex-1">{item.label}</span>
              {item.badge && (
                <span
                  className="text-[11px] font-normal"
                  style={{ color: "var(--text-muted-custom)" }}
                >
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-3 pb-3">
        {/* Theme toggle */}
        <button
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className="flex items-center gap-2.5 rounded-md px-2 py-1.5 w-full text-[13px] font-medium cursor-pointer border-none"
          style={{
            backgroundColor: "transparent",
            color: "var(--text-sub)",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = "var(--hover-bg)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = "transparent";
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

        {/* User row */}
        <div className="flex items-center gap-2.5 px-2 py-1.5">
          <div
            className="flex items-center justify-center rounded-full text-[11px] font-semibold text-white"
            style={{
              width: 26,
              height: 26,
              backgroundColor: "#EC4899",
            }}
          >
            SR
          </div>
          <div>
            <div
              className="text-[13px] font-medium leading-tight"
              style={{ color: "var(--text-primary)" }}
            >
              Sophie R.
            </div>
            <div
              className="text-[11px] leading-tight"
              style={{ color: "var(--text-muted-custom)" }}
            >
              Founder
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
