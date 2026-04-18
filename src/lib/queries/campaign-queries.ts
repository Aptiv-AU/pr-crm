import { unstable_cache } from "next/cache";
import { db } from "@/lib/db";
import { CampaignStatus } from "@prisma/client";

export async function getCampaigns(
  organizationId: string,
  filters?: { type?: string; status?: CampaignStatus | "All"; clientId?: string }
) {
  const campaigns = await db.campaign.findMany({
    where: {
      organizationId,
      archivedAt: null,
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
          logo: true,
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
          logo: true,
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
              photo: true,
              outlet: true,
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
          sentAt: true,
          followUpNumber: true,
          contact: {
            select: {
              id: true,
              name: true,
              initials: true,
              avatarBg: true,
              avatarFg: true,
              photo: true,
              email: true,
              outlet: true,
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
          url: true,
          mediaValue: true,
          attachmentUrl: true,
          notes: true,
          campaignId: true,
          contactId: true,
          contact: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: { date: "desc" },
      },
    },
  });

  return campaign;
}

/**
 * Tag-scoped cached detail fetch. Busted by any mutation on the
 * campaign or its joined children (phases, contacts, suppliers,
 * budget line items, outreach, coverage).
 */
export const getCampaignByIdCached = (campaignId: string) =>
  unstable_cache(
    async (id: string) => getCampaignById(id),
    ["campaign-detail", campaignId],
    { tags: [`campaign:${campaignId}`], revalidate: 3600 },
  )(campaignId);

export async function getCampaignStats(organizationId: string) {
  const [total, active, draft, complete] = await Promise.all([
    db.campaign.count({ where: { organizationId, archivedAt: null } }),
    db.campaign.count({ where: { organizationId, archivedAt: null, status: CampaignStatus.active } }),
    db.campaign.count({ where: { organizationId, archivedAt: null, status: CampaignStatus.draft } }),
    db.campaign.count({ where: { organizationId, archivedAt: null, status: CampaignStatus.complete } }),
  ]);

  return { total, active, draft, complete };
}

export const getCampaignStatsCached = (organizationId: string) =>
  unstable_cache(
    async (id: string) => getCampaignStats(id),
    ["campaign-stats", organizationId],
    { tags: [`stats:${organizationId}`], revalidate: 60 },
  )(organizationId);

export async function getCampaignFilters(organizationId: string) {
  const [typesRaw, clients] = await Promise.all([
    db.campaign.findMany({
      where: { organizationId, archivedAt: null },
      select: { type: true },
      distinct: ["type"],
      orderBy: { type: "asc" },
    }),
    db.client.findMany({
      where: { organizationId, archivedAt: null },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return {
    types: typesRaw.map((t) => t.type),
    clients,
  };
}

export const getCampaignFiltersCached = (organizationId: string) =>
  unstable_cache(
    async (id: string) => getCampaignFilters(id),
    ["campaign-filters", organizationId],
    { tags: [`campaigns:${organizationId}`], revalidate: 300 },
  )(organizationId);
