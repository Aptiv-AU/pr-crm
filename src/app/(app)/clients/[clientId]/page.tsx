import { notFound } from "next/navigation";
import { getClientById, getClientStats } from "@/lib/queries/client-queries";
import { ClientHero } from "@/components/clients/client-hero";
import { ClientTabs } from "@/components/clients/client-tabs";
import { db } from "@/lib/db";
import { isCuid } from "@/lib/slug/resolve";
import { getRetainerPeriods } from "@/lib/queries/retainer-queries";
import { activePeriodOn } from "@/lib/retainer";
import { getCurrentOrg } from "@/lib/queries/org-queries";
import type { RetainerPeriodView } from "@/components/clients/retainer-panel";

export const dynamic = "force-dynamic";

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ clientId: string }>;
}) {
  const { clientId: handle } = await params;

  const org = await getCurrentOrg();
  if (!org) notFound();

  let clientId: string | null = null;
  if (isCuid(handle)) {
    // Validate CUID belongs to caller's org — getClientById is unscoped.
    const owned = await db.client.findFirst({
      where: { id: handle, organizationId: org.id },
      select: { id: true },
    });
    clientId = owned?.id ?? null;
  } else {
    const found = await db.client.findFirst({
      where: { organizationId: org.id, slug: handle },
      select: { id: true },
    });
    clientId = found?.id ?? null;
  }
  if (!clientId) notFound();

  const [client, stats, periods] = await Promise.all([
    getClientById(clientId),
    getClientStats(clientId),
    getRetainerPeriods(clientId),
  ]);

  if (!client) {
    notFound();
  }

  const periodViews: RetainerPeriodView[] = periods.map((p) => ({
    id: p.id,
    cadence: p.cadence,
    amountCents: p.amount,
    startIso: p.startDate.toISOString(),
    endIso: p.endDate?.toISOString() ?? null,
    note: p.note,
  }));
  const activeRow = activePeriodOn(periods);
  const activePeriod = activeRow
    ? periodViews.find((pv) => pv.id === activeRow.id) ?? null
    : null;

  return (
    <div className="px-6 py-8 md:px-10 md:py-10 max-w-[1600px] mx-auto space-y-6">
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
        hasActiveCampaigns={client.campaigns.some((c) => c.status !== "complete")}
        retainer={{
          periods: periodViews,
          currency: client.currency || org?.currency || "AUD",
          locale: org?.locale || "en-AU",
          activePeriod,
        }}
      />

      <div>
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
            budget: c.budget == null ? null : Number(c.budget),
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
