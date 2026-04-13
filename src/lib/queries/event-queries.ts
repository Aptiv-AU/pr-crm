import { db } from "@/lib/db";

export async function getEventCampaigns(organizationId: string) {
  const campaigns = await db.campaign.findMany({
    where: {
      organizationId,
      type: "event",
    },
    include: {
      client: {
        select: {
          id: true,
          name: true,
          initials: true,
          colour: true,
          bgColour: true,
        },
      },
      eventDetail: {
        select: {
          venue: true,
          eventDate: true,
          eventTime: true,
          guestCount: true,
        },
      },
      _count: {
        select: {
          campaignContacts: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return campaigns;
}

export async function getEventDetail(campaignId: string) {
  const campaign = await db.campaign.findUnique({
    where: { id: campaignId },
    include: {
      eventDetail: {
        include: {
          runsheetEntries: {
            orderBy: { order: "asc" },
          },
        },
      },
      campaignContacts: {
        include: {
          contact: {
            select: {
              id: true,
              name: true,
              initials: true,
              avatarBg: true,
              avatarFg: true,
              publication: true,
              email: true,
            },
          },
        },
      },
      campaignSuppliers: {
        include: {
          supplier: {
            select: {
              id: true,
              name: true,
              serviceCategory: true,
            },
          },
        },
      },
    },
  });

  return campaign;
}
