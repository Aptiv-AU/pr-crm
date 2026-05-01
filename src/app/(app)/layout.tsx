import { AppShell } from "@/components/layout/app-shell";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  getOrgById,
  getSidebarBadgeCounts,
  getSidebarClients,
} from "@/lib/queries/org-queries";
import { redirect } from "next/navigation";

// W6: per-query tag-scoped caches now cover badge counts and the
// client sidebar. Mutations invalidate `stats:${orgId}` / `clients:${orgId}`
// directly, so the blanket segment-level revalidate is no longer needed.

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) {
    redirect("/auth/signin");
  }

  // Find org via the authenticated user
  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { organizationId: true, name: true },
  });

  let org = user?.organizationId ? await getOrgById(user.organizationId) : null;

  if (!org) {
    // Edge case: user exists but no org (legacy account, or org row deleted).
    // Create a fresh org for this user — never auto-join an existing tenant.
    const fresh = await db.organization.create({
      data: { name: "My Organization", currency: "AUD" },
    });
    await db.user.update({
      where: { id: session.user.id },
      data: { organizationId: fresh.id },
    });
    org = fresh;
  }

  const [clients, badges] = await Promise.all([
    getSidebarClients(org.id),
    getSidebarBadgeCounts(org.id),
  ]);

  return (
    <AppShell
      clients={clients}
      badgeCounts={{
        contacts: badges.contacts,
        campaigns: badges.campaigns,
        outreach: badges.outreach,
      }}
      userData={{
        name: user?.name ?? session.user.email?.split("@")[0] ?? "User",
        orgName: org.name,
        orgLogo: org.logo,
        locale: org.locale,
        timezone: org.timezone,
      }}
    >
      {children}
    </AppShell>
  );
}
