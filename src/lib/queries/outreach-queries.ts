import { db } from "@/lib/db";
import { OutreachStatus } from "@prisma/client";

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
    db.outreach.count({ where: { campaign: { organizationId }, status: OutreachStatus.draft } }),
    db.outreach.count({ where: { campaign: { organizationId }, status: OutreachStatus.approved } }),
    db.outreach.count({ where: { campaign: { organizationId }, status: OutreachStatus.sent } }),
    db.outreach.count({ where: { campaign: { organizationId }, status: OutreachStatus.replied } }),
  ]);
  return { total, draft, approved, sent, replied };
}
