import { unstable_cache } from "next/cache";
import { db } from "@/lib/db";
import { OutreachStatus } from "@prisma/client";

/**
 * P0-1: hard cap at 500 most-recent rows. The /outreach page renders
 * everything as a client-side Kanban; without this, an org with 50K
 * outreaches blows past Vercel's 4.5 MB RSC payload cap and OOMs on
 * mobile. Server-side filter/paginate is the proper fix; this cap
 * stops the bleeding until that ships.
 */
export const OUTREACH_LIST_HARD_LIMIT = 500;

export async function getAllOutreaches(organizationId: string) {
  return db.outreach.findMany({
    where: { campaign: { organizationId } },
    include: {
      contact: {
        select: { id: true, name: true, initials: true, avatarBg: true, avatarFg: true, photo: true, outlet: true, tier: true },
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
    take: OUTREACH_LIST_HARD_LIMIT,
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

export const getOutreachStatsCached = (organizationId: string) =>
  unstable_cache(
    async (id: string) => getOutreachStats(id),
    ["outreach-stats", organizationId],
    { tags: [`stats:${organizationId}`], revalidate: 60 },
  )(organizationId);
