import { db } from "@/lib/db";

export async function getCampaigns(
  organizationId: string,
  filters?: { type?: string; status?: string; clientId?: string }
) {
  const campaigns = await db.campaign.findMany({
    where: {
      organizationId,
      ...(filters?.type && filters.type !== "All" ? { type: filters.type } : {}),
      ...(filters?.status && filters.status !== "All" ? { status: filters.status } : {}),
      ...(filters?.clientId && filters.clientId !== "All" ? { clientId: filters.clientId } : {}),
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
      _count: {
        select: {
          campaignContacts: true,
          outreaches: true,
          coverages: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return campaigns;
}

export async function getCampaignById(campaignId: string) {
  const campaign = await db.campaign.findUnique({
    where: { id: campaignId },
    include: {
      client: {
        select: {
          id: true,
          name: true,
          industry: true,
          initials: true,
          colour: true,
          bgColour: true,
        },
      },
      phases: {
        orderBy: { order: "asc" },
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
              beat: true,
              tier: true,
              health: true,
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
      budgetLineItems: {
        include: {
          supplier: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
      outreaches: {
        select: {
          id: true,
          subject: true,
          body: true,
          status: true,
          generatedByAI: true,
          contactId: true,
          createdAt: true,
          contact: {
            select: {
              id: true,
              name: true,
              initials: true,
              avatarBg: true,
              avatarFg: true,
              publication: true,
            },
          },
        },
      },
      coverages: {
        select: {
          id: true,
          publication: true,
          date: true,
          type: true,
          mediaValue: true,
        },
      },
    },
  });

  return campaign;
}

export async function getCampaignStats(organizationId: string) {
  const [total, active, draft, complete] = await Promise.all([
    db.campaign.count({ where: { organizationId } }),
    db.campaign.count({ where: { organizationId, status: "active" } }),
    db.campaign.count({ where: { organizationId, status: "draft" } }),
    db.campaign.count({ where: { organizationId, status: "complete" } }),
  ]);

  return { total, active, draft, complete };
}

export async function getCampaignFilters(organizationId: string) {
  const [typesRaw, clients] = await Promise.all([
    db.campaign.findMany({
      where: { organizationId },
      select: { type: true },
      distinct: ["type"],
      orderBy: { type: "asc" },
    }),
    db.client.findMany({
      where: { organizationId },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return {
    types: typesRaw.map((t) => t.type),
    clients,
  };
}
