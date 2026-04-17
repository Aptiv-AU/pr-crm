import { db } from "@/lib/db";
import { getAllOutreaches, getOutreachStats } from "@/lib/queries/outreach-queries";
import { OutreachListClient } from "@/components/outreach/outreach-list-client";

export const dynamic = "force-dynamic";

export default async function OutreachPage() {
  let org = await db.organization.findFirst();
  if (!org) {
    org = await db.organization.create({ data: { name: "NWPR", currency: "AUD" } });
  }

  const [outreaches, stats] = await Promise.all([
    getAllOutreaches(org.id),
    getOutreachStats(org.id),
  ]);

  const serializedOutreaches = outreaches.map((o) => ({
    id: o.id,
    subject: o.subject,
    status: o.status,
    createdAt: o.createdAt.toISOString(),
    contact: { ...o.contact, publication: o.contact.outlet ?? "" },
    campaign: {
      id: o.campaign.id,
      name: o.campaign.name,
      client: o.campaign.client,
    },
  }));

  return (
    <OutreachListClient outreaches={serializedOutreaches} stats={stats} />
  );
}
