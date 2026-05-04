import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getEventDetail } from "@/lib/queries/event-queries";
import { getContacts } from "@/lib/queries/contact-queries";
import { getCurrentOrg } from "@/lib/queries/org-queries";
import { createOrUpdateEventDetail } from "@/actions/event-actions";
import { EventDetailClient } from "@/components/events/event-detail-client";
import { isCuid } from "@/lib/slug/resolve";

export const dynamic = "force-dynamic";

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ campaignId: string }>;
}) {
  const { campaignId: handle } = await params;

  const org = await getCurrentOrg();
  if (!org) notFound();

  let campaignId: string | null = null;
  if (isCuid(handle)) {
    const owned = await db.campaign.findFirst({
      where: { id: handle, organizationId: org.id },
      select: { id: true },
    });
    campaignId = owned?.id ?? null;
  } else {
    const found = await db.campaign.findFirst({
      where: { organizationId: org.id, slug: handle },
      select: { id: true },
    });
    campaignId = found?.id ?? null;
  }
  if (!campaignId) notFound();

  const campaign = await getEventDetail(campaignId);

  if (!campaign || campaign.type !== "event") {
    notFound();
  }

  // If no eventDetail exists, create an empty one
  let eventDetail = campaign.eventDetail;
  if (!eventDetail) {
    const fd = new FormData();
    await createOrUpdateEventDetail(campaignId, fd);
    // Re-fetch to get the created eventDetail
    const refreshed = await getEventDetail(campaignId);
    if (!refreshed?.eventDetail) {
      notFound();
    }
    eventDetail = refreshed.eventDetail;
  }

  const orgContacts = await getContacts(org.id);

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

  // Serialize data
  const serializedCampaign = {
    id: campaign.id,
    name: campaign.name,
    type: campaign.type,
    status: campaign.status,
    client: campaign.client
      ? {
          id: campaign.client.id,
          name: campaign.client.name,
          initials: campaign.client.initials,
          colour: campaign.client.colour,
          bgColour: campaign.client.bgColour,
        }
      : { id: "", name: "Unknown", initials: "?", colour: "#666", bgColour: "#eee" },
  };

  const serializedEventDetail = {
    id: eventDetail!.id,
    venue: eventDetail!.venue,
    eventDate: eventDetail!.eventDate
      ? eventDetail!.eventDate.toISOString()
      : null,
    eventTime: eventDetail!.eventTime,
    guestCount: eventDetail!.guestCount,
  };

  const serializedRunsheetEntries = (eventDetail!.runsheetEntries ?? []).map(
    (entry) => ({
      id: entry.id,
      time: entry.time,
      endTime: entry.endTime,
      activity: entry.activity,
      assignee: entry.assignee,
      location: entry.location,
      notes: entry.notes,
      order: entry.order,
    })
  );

  const serializedContacts = campaign.campaignContacts.map((cc) => ({
    id: cc.id,
    contactId: cc.contact.id,
    status: cc.status,
    contact: {
      id: cc.contact.id,
      name: cc.contact.name,
      initials: cc.contact.initials,
      avatarBg: cc.contact.avatarBg,
      avatarFg: cc.contact.avatarFg,
      photo: cc.contact.photo,
      outlet: cc.contact.outlet ?? "",
      email: cc.contact.email,
    },
  }));

  const serializedSuppliers = (campaign.campaignSuppliers ?? []).map((cs) => ({
    id: cs.id,
    role: cs.role,
    agreedCost: cs.agreedCost ? Number(cs.agreedCost) : null,
    supplier: {
      id: cs.supplier.id,
      name: cs.supplier.name,
      serviceCategory: cs.supplier.serviceCategory,
    },
  }));

  return (
    <EventDetailClient
      campaign={serializedCampaign}
      eventDetail={serializedEventDetail}
      runsheetEntries={serializedRunsheetEntries}
      campaignContacts={serializedContacts}
      availableContacts={availableContacts}
      campaignSuppliers={serializedSuppliers}
    />
  );
}
