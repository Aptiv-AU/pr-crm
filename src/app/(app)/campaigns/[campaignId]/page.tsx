import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getCampaignByIdCached } from "@/lib/queries/campaign-queries";
import { getContacts } from "@/lib/queries/contact-queries";
import { getSuppliers } from "@/lib/queries/supplier-queries";
import { CampaignDetailClient } from "@/components/campaigns/campaign-detail-client";
import { isCuid } from "@/lib/slug/resolve";

export const dynamic = "force-dynamic";

// unstable_cache serializes Date → string, so callers must handle either shape.
function toIso(d: Date | string | null | undefined): string | null {
  if (d == null) return null;
  return typeof d === "string" ? d : d.toISOString();
}

export default async function CampaignDetailPage({
  params,
}: {
  params: Promise<{ campaignId: string }>;
}) {
  const { campaignId: handle } = await params;

  let org = await db.organization.findFirst();
  if (!org) {
    org = await db.organization.create({ data: { name: "NWPR", currency: "AUD" } });
  }

  // Resolve handle (cuid or slug) → cuid
  let campaignId: string | null = null;
  if (isCuid(handle)) {
    campaignId = handle;
  } else {
    const found = await db.campaign.findFirst({
      where: { organizationId: org.id, slug: handle },
      select: { id: true },
    });
    campaignId = found?.id ?? null;
  }

  if (!campaignId) {
    notFound();
  }

  const [campaign, orgContacts, orgSuppliers, allClients, emailAccount, suppressions] = await Promise.all([
    getCampaignByIdCached(campaignId),
    getContacts(org.id),
    getSuppliers(org.id),
    db.client.findMany({
      where: { organizationId: org.id },
      select: { id: true, name: true, initials: true, colour: true, bgColour: true },
      orderBy: { name: "asc" },
    }),
    db.emailAccount.findFirst(),
    db.suppression.findMany({
      where: { organizationId: org.id },
      select: { email: true },
    }),
  ]);

  const suppressedEmails = suppressions.map((s) => s.email);

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
      photo: c.photo,
      outlet: c.outlet ?? "",
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

  // Fetch eventDetail for event-type campaigns
  let eventDetailData = null;
  if (campaign.type === "event") {
    const ed = await db.eventDetail.findUnique({
      where: { campaignId },
      include: {
        runsheetEntries: {
          orderBy: { order: "asc" },
          select: { id: true, time: true, activity: true, order: true },
        },
      },
    });
    if (ed) {
      eventDetailData = {
        id: ed.id,
        venue: ed.venue,
        eventDate: toIso(ed.eventDate),
        eventTime: ed.eventTime,
        guestCount: ed.guestCount,
        runsheetEntries: ed.runsheetEntries,
      };
    }
  }

  // Serialize campaign data (dates and Decimals)
  const serializedCampaign = {
    id: campaign.id,
    slug: campaign.slug,
    name: campaign.name,
    type: campaign.type,
    status: campaign.status,
    budget: campaign.budget ? Number(campaign.budget) : null,
    startDate: toIso(campaign.startDate),
    dueDate: toIso(campaign.dueDate),
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
      contact: { ...cc.contact, outlet: cc.contact.outlet ?? "" },
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
      confirmed: item.confirmed,
      supplier: item.supplier,
    })),
    coverages: campaign.coverages.map((cov) => ({
      id: cov.id,
      slug: cov.slug,
      publication: cov.publication,
      date: toIso(cov.date) ?? new Date().toISOString(),
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
      sentAt: toIso(o.sentAt),
      scheduledAt: toIso(o.scheduledAt),
      followUpNumber: o.followUpNumber,
      contact: { ...o.contact, outlet: o.contact.outlet ?? "" },
      replies: o.replies.map((r) => ({
        id: r.id,
        fromEmail: r.fromEmail,
        fromName: r.fromName,
        receivedAt: toIso(r.receivedAt) ?? new Date().toISOString(),
        subject: r.subject,
        bodyText: r.bodyText,
      })),
    })),
  };

  return (
    <CampaignDetailClient
      campaign={serializedCampaign}
      budgetStats={budgetStats}
      availableContacts={availableContacts}
      availableSuppliers={availableSuppliers}
      clients={allClients}
      emailConnected={!!emailAccount}
      suppressedEmails={suppressedEmails}
      eventDetail={eventDetailData}
    />
  );
}
