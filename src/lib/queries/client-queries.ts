import { db } from "@/lib/db";

export async function getClients(organizationId: string) {
  const clients = await db.client.findMany({
    where: { organizationId, archivedAt: null },
    include: {
      campaigns: {
        select: {
          id: true,
          name: true,
          type: true,
          status: true,
        },
      },
      _count: {
        select: { campaigns: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return clients;
}

export async function getClientById(clientId: string) {
  const client = await db.client.findUnique({
    where: { id: clientId },
    include: {
      campaigns: {
        include: {
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
          outreaches: {
            select: {
              id: true,
              subject: true,
              status: true,
              createdAt: true,
              contact: {
                select: {
                  id: true,
                  name: true,
                  initials: true,
                  avatarBg: true,
                  avatarFg: true,
                  photo: true,
                  publication: true,
                },
              },
            },
            orderBy: { createdAt: "desc" },
          },
          coverages: {
            select: { id: true },
          },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  return client;
}

export async function getOrganizationStats(organizationId: string) {
  const [clientCount, contactCount, campaignCount, mediaValueResult] =
    await Promise.all([
      db.client.count({ where: { organizationId } }),
      db.contact.count({ where: { organizationId } }),
      db.campaign.count({
        where: {
          organizationId,
          status: { not: "complete" },
        },
      }),
      db.coverage.aggregate({
        where: { organizationId },
        _sum: { mediaValue: true },
      }),
    ]);

  return {
    clientCount,
    contactCount,
    campaignCount,
    mediaValue: mediaValueResult._sum.mediaValue ?? 0,
  };
}

export async function getClientStats(clientId: string) {
  const [contactCount, campaignCount, coverageCount, outreaches] =
    await Promise.all([
      db.campaignContact.count({
        where: { campaign: { clientId } },
      }),
      db.campaign.count({ where: { clientId } }),
      db.coverage.count({ where: { campaign: { clientId } } }),
      db.outreach.findMany({
        where: { campaign: { clientId } },
        select: { status: true },
      }),
    ]);

  const totalOutreaches = outreaches.length;
  const repliedOutreaches = outreaches.filter(
    (o) => o.status === "replied"
  ).length;
  const replyRate =
    totalOutreaches > 0
      ? Math.round((repliedOutreaches / totalOutreaches) * 100)
      : 0;

  return {
    contactCount,
    campaignCount,
    coverageCount,
    replyRate,
  };
}
