import { db } from "@/lib/db";
import { getCoverages, getCoverageStats } from "@/lib/queries/coverage-queries";
import { CoverageListClient } from "@/components/coverage/coverage-list-client";

export const dynamic = "force-dynamic";

export default async function CoveragePage() {
  let org = await db.organization.findFirst();
  if (!org) {
    org = await db.organization.create({ data: { name: "NWPR", currency: "AUD" } });
  }

  const [coverages, stats, campaigns, contacts] = await Promise.all([
    getCoverages(org.id),
    getCoverageStats(org.id),
    db.campaign.findMany({
      where: { organizationId: org.id },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    db.contact.findMany({
      where: { organizationId: org.id },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const serializedCoverages = coverages.map((c) => ({
    id: c.id,
    slug: c.slug,
    publication: c.publication,
    date: c.date.toISOString(),
    type: c.type,
    url: c.url,
    mediaValue: c.mediaValue ? Number(c.mediaValue) : null,
    attachmentUrl: c.attachmentUrl,
    notes: c.notes,
    campaignId: c.campaignId,
    contactId: c.contactId,
    campaign: c.campaign
      ? {
          id: c.campaign.id,
          name: c.campaign.name,
          client: c.campaign.client,
        }
      : null,
    contact: c.contact,
  }));

  return (
    <CoverageListClient
      coverages={serializedCoverages}
      stats={stats}
      campaigns={campaigns}
      contacts={contacts}
    />
  );
}
