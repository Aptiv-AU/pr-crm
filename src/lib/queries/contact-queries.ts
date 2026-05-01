import { unstable_cache } from "next/cache";
import { db } from "@/lib/db";
import { buildSegmentWhere, type SegmentFilter } from "@/lib/segments/filter";

export async function getContactsByFilter(orgId: string, filter: SegmentFilter) {
  return db.contact.findMany({
    where: buildSegmentWhere(orgId, filter),
    include: { tags: { include: { tag: true } } },
    orderBy: { name: "asc" },
  });
}

export async function getContacts(organizationId: string, beat?: string) {
  const contacts = await db.contact.findMany({
    where: {
      organizationId,
      ...(beat && beat !== "All" ? { beat } : {}),
    },
    include: {
      interactions: {
        select: { date: true },
        orderBy: { date: "desc" },
        take: 1,
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return contacts;
}

export async function getContactById(contactId: string, organizationId: string) {
  const contact = await db.contact.findFirst({
    where: { id: contactId, organizationId },
    include: {
      campaignContacts: {
        include: {
          campaign: {
            select: {
              id: true,
              name: true,
              type: true,
              status: true,
              client: {
                select: {
                  id: true,
                  name: true,
                  initials: true,
                  colour: true,
                  bgColour: true,
                },
              },
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
          campaignId: true,
        },
        orderBy: { createdAt: "desc" },
      },
      coverages: {
        select: {
          id: true,
          publication: true,
          date: true,
          type: true,
          mediaValue: true,
          url: true,
          attachmentUrl: true,
        },
        orderBy: { date: "desc" },
      },
      interactions: {
        select: {
          id: true,
          type: true,
          date: true,
          summary: true,
        },
        orderBy: { date: "desc" },
        take: 20,
      },
    },
  });

  return contact;
}

/**
 * Tag-scoped cached wrapper around `getContactById`.
 * Busted by any mutation on the contact or its joined children
 * (outreach, coverage, campaignContact, interaction, tag assignment).
 */
export const getContactByIdCached = (contactId: string, organizationId: string) =>
  unstable_cache(
    async (id: string, orgId: string) => getContactById(id, orgId),
    ["contact-detail", contactId, organizationId],
    { tags: [`contact:${contactId}`], revalidate: 3600 },
  )(contactId, organizationId);

export async function getContactStats(organizationId: string) {
  const [total, aList, warm] = await Promise.all([
    db.contact.count({ where: { organizationId } }),
    db.contact.count({ where: { organizationId, tier: "A-list" } }),
    db.contact.count({ where: { organizationId, health: "warm" } }),
  ]);

  return { total, aList, warm };
}

export const getContactStatsCached = (organizationId: string) =>
  unstable_cache(
    async (id: string) => getContactStats(id),
    ["contact-stats", organizationId],
    { tags: [`stats:${organizationId}`], revalidate: 60 },
  )(organizationId);

export async function getContactDetailStats(contactId: string) {
  const [coverageCount, campaignCount, outreaches] = await Promise.all([
    db.coverage.count({ where: { contactId } }),
    db.campaignContact.count({ where: { contactId } }),
    db.outreach.findMany({
      where: { contactId },
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
    coverageCount,
    replyRate,
    campaignCount,
  };
}

export async function getContactBeats(organizationId: string) {
  const contacts = await db.contact.findMany({
    where: { organizationId },
    select: { beat: true },
    distinct: ["beat"],
    orderBy: { beat: "asc" },
  });

  return contacts.map((c) => c.beat);
}

/**
 * Consolidated filter facets for the contacts list page:
 * beats, outlets, tiers (all `distinct` queries). Tag-scoped by org
 * so a contact create/update/delete flushes the dropdowns.
 */
export const getContactFilterFacets = (organizationId: string) =>
  unstable_cache(
    async (id: string) => {
      const [beats, outletRows, tierRows] = await Promise.all([
        db.contact.findMany({
          where: { organizationId: id },
          select: { beat: true },
          distinct: ["beat"],
          orderBy: { beat: "asc" },
        }),
        db.contact.findMany({
          where: { organizationId: id },
          select: { outlet: true },
          distinct: ["outlet"],
        }),
        db.contact.findMany({
          where: { organizationId: id },
          select: { tier: true },
          distinct: ["tier"],
        }),
      ]);
      return {
        beats: beats.map((b) => b.beat).filter((b): b is string => !!b),
        outlets: outletRows.map((o) => o.outlet).filter((o): o is string => !!o),
        tiers: tierRows.map((t) => t.tier).filter((t): t is string => !!t),
      };
    },
    ["contact-filter-facets", organizationId],
    { tags: [`contacts:${organizationId}`], revalidate: 300 },
  )(organizationId);
