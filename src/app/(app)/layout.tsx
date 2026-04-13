import { AppShell } from "@/components/layout/app-shell";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const org = await db.organization.findFirst();

  const clients = org
    ? await db.client.findMany({
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
      })
    : [];

  return <AppShell clients={clients}>{children}</AppShell>;
}
