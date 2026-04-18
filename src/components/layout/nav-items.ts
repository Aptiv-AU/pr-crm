import type { IconName } from "@/components/ui/icon";

export interface NavItem {
  label: string;
  icon: IconName;
  href: string;
  badge?: string;
}

export interface BadgeCounts {
  contacts: number;
  campaigns: number;
  outreach: number;
}

export function buildGlobalItems(badgeCounts: BadgeCounts): NavItem[] {
  return [
    { label: "Dashboard", icon: "sparkle", href: "/dashboard" },
    { label: "Clients", icon: "workspace", href: "/clients" },
    { label: "Contacts", icon: "contacts", href: "/contacts", badge: badgeCounts.contacts > 0 ? String(badgeCounts.contacts) : undefined },
    { label: "Suppliers", icon: "suppliers", href: "/suppliers" },
    { label: "Coverage", icon: "coverage", href: "/coverage" },
  ];
}

export function buildWorkspaceItems(badgeCounts: BadgeCounts): NavItem[] {
  return [
    { label: "Campaigns", icon: "campaigns", href: "/campaigns", badge: badgeCounts.campaigns > 0 ? String(badgeCounts.campaigns) : undefined },
    { label: "Outreach", icon: "outreach", href: "/outreach", badge: badgeCounts.outreach > 0 ? String(badgeCounts.outreach) : undefined },
    { label: "Events", icon: "events", href: "/events" },
  ];
}
