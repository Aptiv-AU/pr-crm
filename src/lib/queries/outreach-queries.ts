import { db } from "@/lib/db";

export async function getAllOutreaches(organizationId: string) {
  return db.outreach.findMany({
    where: { campaign: { organizationId } },
    include: {
      contact: {
        select: { id: true, name: true, initials: true, avatarBg: true, avatarFg: true, photo: true, outlet: true },
      },
      campaign: {
        select: {
          id: true,
          slug: true,
          name: true,
          client: { select: { id: true, name: true, initials: true, colour: true, bgColour: true, logo: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getOutreachStats(organizationId: string) {
  const [total, draft, approved, sent, replied] = await Promise.all([
    db.outreach.count({ where: { campaign: { organizationId } } }),
    db.outreach.count({ where: { campaign: { organizationId }, status: "draft" } }),
    db.outreach.count({ where: { campaign: { organizationId }, status: "approved" } }),
    db.outreach.count({ where: { campaign: { organizationId }, status: "sent" } }),
    db.outreach.count({ where: { campaign: { organizationId }, status: "replied" } }),
  ]);
  return { total, draft, approved, sent, replied };
}
