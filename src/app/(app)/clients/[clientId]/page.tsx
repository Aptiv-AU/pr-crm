import { notFound } from "next/navigation";
import { getClientById, getClientStats } from "@/lib/queries/client-queries";
import { ClientHero } from "@/components/clients/client-hero";
import { ClientTabs } from "@/components/clients/client-tabs";
import { db } from "@/lib/db";
import { isCuid } from "@/lib/slug/resolve";

export const dynamic = "force-dynamic";

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ clientId: string }>;
}) {
  const { clientId: handle } = await params;

  let clientId: string | null = null;
  if (isCuid(handle)) {
    clientId = handle;
  } else {
    const org = await db.organization.findFirst({ select: { id: true } });
    if (org) {
      const found = await db.client.findFirst({
        where: { organizationId: org.id, slug: handle },
        select: { id: true },
      });
      clientId = found?.id ?? null;
    }
  }
  if (!clientId) notFound();

  const [client, stats] = await Promise.all([
    getClientById(clientId),
    getClientStats(clientId),
  ]);

  if (!client) {
    notFound();
  }

  return (
    <div style={{ padding: "16px" }} className="md:p-6">
      <ClientHero
        client={{
          id: client.id,
          name: client.name,
          industry: client.industry,
          colour: client.colour,
          bgColour: client.bgColour,
          initials: client.initials,
          logo: client.logo,
        }}
        stats={stats}
      />

      <div style={{ marginTop: 20 }}>
        <ClientTabs
          clientId={client.id}
          clientContacts={client.contacts.map((c) => ({
            id: c.id,
            name: c.name,
            role: c.role,
            email: c.email,
            phone: c.phone,
            notes: c.notes,
            isPrimary: c.isPrimary,
          }))}
          campaigns={client.campaigns.map((c) => ({
            ...c,
            campaignContacts: c.campaignContacts.map((cc) => ({
              ...cc,
              contact: { ...cc.contact, outlet: cc.contact.outlet ?? "" },
            })),
            outreaches: c.outreaches.map((o) => ({
              ...o,
              contact: { ...o.contact, outlet: o.contact.outlet ?? "" },
            })),
          }))}
        />
      </div>
    </div>
  );
}
