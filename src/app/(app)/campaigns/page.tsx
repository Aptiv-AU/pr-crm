import { db } from "@/lib/db";
import { getCampaigns, getCampaignStats, getCampaignFilters } from "@/lib/queries/campaign-queries";
import { CampaignsListClient } from "@/components/campaigns/campaigns-list-client";

export const dynamic = "force-dynamic";

export default async function CampaignsPage() {
  let org = await db.organization.findFirst();
  if (!org) {
    org = await db.organization.create({ data: { name: "NWPR", currency: "AUD" } });
  }

  const [campaigns, stats, filters, allClients] = await Promise.all([
    getCampaigns(org.id),
    getCampaignStats(org.id),
    getCampaignFilters(org.id),
    db.client.findMany({
      where: { organizationId: org.id },
      select: { id: true, name: true, initials: true, colour: true, bgColour: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const serializedCampaigns = campaigns.map((c) => ({
    id: c.id,
    slug: c.slug,
    name: c.name,
    type: c.type,
    status: c.status,
    budget: c.budget ? Number(c.budget) : null,
    dueDate: c.dueDate ? c.dueDate.toISOString() : null,
    client: c.client,
    contactCount: c._count.campaignContacts,
    outreachCount: c._count.outreaches,
    coverageCount: c._count.coverages,
  }));

  return (
    <CampaignsListClient
      campaigns={serializedCampaigns}
      stats={stats}
      types={filters.types}
      clients={allClients}
    />
  );
}
