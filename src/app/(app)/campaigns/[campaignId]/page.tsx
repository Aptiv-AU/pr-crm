import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getCampaignById } from "@/lib/queries/campaign-queries";
import { getContacts } from "@/lib/queries/contact-queries";
import { getSuppliers } from "@/lib/queries/supplier-queries";
import { CampaignDetailClient } from "@/components/campaigns/campaign-detail-client";

export const dynamic = "force-dynamic";

export default async function CampaignDetailPage({
  params,
}: {
  params: Promise<{ campaignId: string }>;
}) {
  const { campaignId } = await params;

  let org = await db.organization.findFirst();
  if (!org) {
    org = await db.organization.create({ data: { name: "NWPR", currency: "AUD" } });
  }

  const [campaign, orgContacts, orgSuppliers, allClients] = await Promise.all([
    getCampaignById(campaignId),
    getContacts(org.id),
    getSuppliers(org.id),
    db.client.findMany({
      where: { organizationId: org.id },
      select: { id: true, name: true, initials: true, colour: true, bgColour: true },
      orderBy: { name: "asc" },
    }),
  ]);

  if (!campaign) {
    notFound();
  }

  // Compute budget stats
  const spent = campaign.budgetLineItems.reduce(
    (sum, item) => sum + Number(item.amount),
    0
  );
  const budgetStats = {
    spent,
    total: campaign.budget ? Number(campaign.budget) : null,
  };

  // Filter available contacts (not already in this campaign)
  const campaignContactIds = new Set(
    campaign.campaignContacts.map((cc) => cc.contactId)
  );
  const availableContacts = orgContacts
    .filter((c) => !campaignContactIds.has(c.id))
    .map((c) => ({
      id: c.id,
      name: c.name,
      initials: c.initials,
      avatarBg: c.avatarBg,
      avatarFg: c.avatarFg,
      publication: c.publication,
    }));

  // Filter available suppliers (not already in this campaign)
  const campaignSupplierIds = new Set(
    campaign.campaignSuppliers.map((cs) => cs.supplierId)
  );
  const availableSuppliers = orgSuppliers
    .filter((s) => !campaignSupplierIds.has(s.id))
    .map((s) => ({
      id: s.id,
      name: s.name,
      serviceCategory: s.serviceCategory,
    }));

  // Serialize campaign data (dates and Decimals)
  const serializedCampaign = {
    id: campaign.id,
    name: campaign.name,
    type: campaign.type,
    status: campaign.status,
    budget: campaign.budget ? Number(campaign.budget) : null,
    startDate: campaign.startDate ? campaign.startDate.toISOString() : null,
    dueDate: campaign.dueDate ? campaign.dueDate.toISOString() : null,
    brief: campaign.brief,
    clientId: campaign.clientId,
    client: campaign.client,
    phases: campaign.phases.map((p) => ({
      id: p.id,
      name: p.name,
      order: p.order,
      status: p.status,
    })),
    campaignContacts: campaign.campaignContacts.map((cc) => ({
      id: cc.id,
      contactId: cc.contactId,
      status: cc.status,
      contact: cc.contact,
    })),
    campaignSuppliers: campaign.campaignSuppliers.map((cs) => ({
      id: cs.id,
      supplierId: cs.supplierId,
      role: cs.role,
      agreedCost: cs.agreedCost ? Number(cs.agreedCost) : null,
      status: cs.status ?? "active",
      supplier: cs.supplier,
    })),
    budgetLineItems: campaign.budgetLineItems.map((item) => ({
      id: item.id,
      description: item.description,
      amount: Number(item.amount),
      supplier: item.supplier,
    })),
    coverages: campaign.coverages.map((cov) => ({
      id: cov.id,
      publication: cov.publication,
      date: cov.date ? cov.date.toISOString() : new Date().toISOString(),
      type: cov.type,
      url: cov.url,
      mediaValue: cov.mediaValue ? Number(cov.mediaValue) : null,
      attachmentUrl: cov.attachmentUrl,
      notes: cov.notes,
      campaignId: cov.campaignId,
      contactId: cov.contactId,
      contact: cov.contact,
    })),
    outreaches: campaign.outreaches.map((o) => ({
      id: o.id,
      subject: o.subject,
      body: o.body,
      status: o.status,
      generatedByAI: o.generatedByAI,
      contactId: o.contactId,
      contact: o.contact,
    })),
  };

  return (
    <CampaignDetailClient
      campaign={serializedCampaign}
      budgetStats={budgetStats}
      availableContacts={availableContacts}
      availableSuppliers={availableSuppliers}
      clients={allClients}
    />
  );
}
