import { AppShell } from "@/components/layout/app-shell";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const org = await db.organization.findFirst();

  if (!org) {
    return <AppShell clients={[]} badgeCounts={{ contacts: 0, campaigns: 0, outreach: 0 }} userData={{ name: "User", orgName: "Pressroom" }}>{children}</AppShell>;
  }

  const [clients, contactCount, activeCampaignCount, draftOutreachCount, user] = await Promise.all([
    db.client.findMany({
      where: { organizationId: org.id },
      select: {
        id: true,
        name: true,
        industry: true,
        colour: true,
        bgColour: true,
        initials: true,
      },
      orderBy: { name: "asc" },
    }),
    db.contact.count({ where: { organizationId: org.id } }),
    db.campaign.count({ where: { organizationId: org.id, status: { not: "complete" } } }),
    db.outreach.count({ where: { campaign: { organizationId: org.id }, status: "draft" } }),
    db.user.findFirst({ where: { organizationId: org.id } }),
  ]);

  return (
    <AppShell
      clients={clients}
      badgeCounts={{ contacts: contactCount, campaigns: activeCampaignCount, outreach: draftOutreachCount }}
      userData={{
        name: user?.name ?? org.name,
        orgName: org.name,
      }}
    >
      {children}
    </AppShell>
  );
}
