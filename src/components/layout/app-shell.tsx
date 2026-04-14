"use client";

import { useState } from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { MobileDrawer } from "@/components/layout/mobile-drawer";
import { Topbar } from "@/components/layout/topbar";

interface ClientOption {
  id: string;
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
      <div className="flex flex-1 flex-col overflow-hidden">
        <Topbar onMenuClick={() => setDrawerOpen(true)} />
        <main
          className="flex-1 overflow-y-auto"
          style={{ WebkitOverflowScrolling: "touch" } as React.CSSProperties}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
