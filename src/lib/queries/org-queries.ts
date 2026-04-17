import { cache } from "react";
import { unstable_cache } from "next/cache";
import { db } from "@/lib/db";
import { requireOrgId } from "@/lib/server/org";

/**
 * Per-request memoised, cross-request cached fetch of the current
 * organisation row.
 *
 * - `React.cache` dedupes within a single render tree so a layout and
 *   a descendant page hitting `getCurrentOrg()` share one DB read.
 * - `unstable_cache` persists the row across requests and is keyed by
 *   `orgId` (via the key parts); tagged `org:${orgId}` so a mutation
 *   to the organisation (branding/name/currency) can bust exactly the
 *   owning org's entry without touching others.
 */
export const getCurrentOrg = cache(async () => {
  const orgId = await requireOrgId();
  return getOrgById(orgId);
});

export const getOrgById = (orgId: string) =>
  unstable_cache(
    async (id: string) => db.organization.findUnique({ where: { id } }),
    ["organization", orgId],
    { tags: [`org:${orgId}`], revalidate: 3600 },
  )(orgId);

/**
 * Sidebar badge counts. Cheap safety net (60s) plus tag-scoped
 * invalidation via `stats:${orgId}` so mutations flush immediately.
 */
export const getSidebarBadgeCounts = (orgId: string) =>
  unstable_cache(
    async (id: string) => {
      // Import here to keep top of file cheap; these are cheap queries.
      const { CampaignStatus, OutreachStatus } = await import("@prisma/client");
      const [contacts, campaigns, outreach] = await Promise.all([
        db.contact.count({ where: { organizationId: id } }),
        db.campaign.count({
          where: { organizationId: id, status: { not: CampaignStatus.complete } },
        }),
        db.outreach.count({
          where: {
            campaign: { organizationId: id },
            status: OutreachStatus.draft,
          },
        }),
      ]);
      return { contacts, campaigns, outreach };
    },
    ["sidebar-badge-counts", orgId],
    { tags: [`stats:${orgId}`], revalidate: 60 },
  )(orgId);

/**
 * Sidebar client list (navigation element). Rare writes, heavy reads.
 */
export const getSidebarClients = (orgId: string) =>
  unstable_cache(
    async (id: string) =>
      db.client.findMany({
        where: { organizationId: id },
        select: {
          id: true,
          slug: true,
          name: true,
          industry: true,
          colour: true,
          bgColour: true,
          initials: true,
          logo: true,
        },
        orderBy: { name: "asc" },
      }),
    ["sidebar-clients", orgId],
    { tags: [`clients:${orgId}`], revalidate: 300 },
  )(orgId);
