import { notFound } from "next/navigation";
import { getAllOutreaches, getOutreachStatsCached } from "@/lib/queries/outreach-queries";
import { getCurrentOrg } from "@/lib/queries/org-queries";
import { OutreachListClient } from "@/components/outreach/outreach-list-client";

export const dynamic = "force-dynamic";

export default async function OutreachPage() {
  const org = await getCurrentOrg();
  if (!org) notFound();

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
