import { db } from "@/lib/db";
import { getAllOutreaches, getOutreachStatsCached } from "@/lib/queries/outreach-queries";
import { OutreachListClient } from "@/components/outreach/outreach-list-client";

export const dynamic = "force-dynamic";

export default async function OutreachPage() {
  let org = await db.organization.findFirst();
  if (!org) {
    org = await db.organization.create({ data: { name: "NWPR", currency: "AUD" } });
  }

  const [outreaches, stats] = await Promise.all([
    getAllOutreaches(org.id),
    getOutreachStatsCached(org.id),
  ]);

  const serializedOutreaches = outreaches.map((o) => ({
    id: o.id,
    subject: o.subject,
    status: o.status,
    createdAt: o.createdAt.toISOString(),
    contact: { ...o.contact, outlet: o.contact.outlet ?? "", tier: o.contact.tier ?? null },
    campaign: {
      id: o.campaign.id,
      slug: o.campaign.slug,
      name: o.campaign.name,
      client: o.campaign.client,
    },
  }));

  return (
    <OutreachListClient outreaches={serializedOutreaches} stats={stats} />
  );
}
