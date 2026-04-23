"use client";

import { useState } from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { MobileDrawer } from "@/components/layout/mobile-drawer";
import { GlobalSearch } from "@/components/shared/global-search";
import { Icon } from "@/components/ui/icon";

function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0]!.toUpperCase())
    .slice(0, 2)
    .join("");
}

interface ClientOption {
  id: string;
  slug: string;
  name: string;
  industry: string;
  colour: string;
  bgColour: string;
  initials: string;
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

interface AppShellProps {
  children: React.ReactNode;
  clients: ClientOption[];
  badgeCounts: BadgeCounts;
  userData: UserData;
}

export function AppShell({ children, clients, badgeCounts, userData }: AppShellProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <div className="flex h-screen" style={{ backgroundColor: "var(--page-bg)" }}>
      <Sidebar clients={clients} badgeCounts={badgeCounts} userData={userData} />
      <MobileDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} clients={clients} badgeCounts={badgeCounts} userData={userData} />
      <GlobalSearch />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Topbar
          userInitials={getInitials(userData.name)}
          userName={userData.name}
          userRole={userData.orgName}
        />
        <main
          className="flex-1 overflow-y-auto"
          style={{ WebkitOverflowScrolling: "touch" } as React.CSSProperties}
        >
          {children}
        </main>
      </div>

      {/* Mobile floating menu button (drawer replaces the removed mobile topbar) */}
      {!drawerOpen && (
        <button
          onClick={() => setDrawerOpen(true)}
          aria-label="Open menu"
          className="md:hidden fixed flex items-center justify-center rounded-full border-none cursor-pointer"
          style={{
            top: "calc(env(safe-area-inset-top, 0px) + 10px)",
            left: 12,
            width: 40,
            height: 40,
            backgroundColor: "var(--card-bg)",
            border: "1px solid var(--border-custom)",
            boxShadow: "0 2px 8px rgba(0,0,0,0.12)",
            zIndex: 100,
          }}
        >
          <Icon name="menu" size={18} color="var(--text-primary)" />
        </button>
      )}
    </div>
  );
}
