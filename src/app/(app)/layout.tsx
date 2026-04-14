import { AppShell } from "@/components/layout/app-shell";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";

export const revalidate = 30; // revalidate layout data every 30 seconds (badge counts, client list)

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

  let org = user?.organizationId
    ? await db.organization.findUnique({ where: { id: user.organizationId } })
    : null;

  if (!org) {
    // Edge case: user exists but no org — create one and assign
    org = await db.organization.findFirst();
    if (!org) {
      org = await db.organization.create({
        data: { name: "My Organization", currency: "AUD" },
      });
    }
    await db.user.update({
      where: { id: session.user.id },
      data: { organizationId: org.id },
    });
  }

  const [clients, contactCount, activeCampaignCount, draftOutreachCount] = await Promise.all([
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
  ]);

  return (
    <AppShell
      clients={clients}
      badgeCounts={{ contacts: contactCount, campaigns: activeCampaignCount, outreach: draftOutreachCount }}
      userData={{
        name: user?.name ?? session.user.email?.split("@")[0] ?? "User",
        orgName: org.name,
      }}
    >
      {children}
    </AppShell>
  );
}
