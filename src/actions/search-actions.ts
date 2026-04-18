"use server";

import { db } from "@/lib/db";
import { requireOrgId } from "@/lib/server/org";

interface SearchResult {
  type: "client" | "contact" | "campaign" | "supplier";
  id: string;
  title: string;
  subtitle: string;
  href: string;
  initials?: string;
  colour?: string;
  bgColour?: string;
  photo?: string | null;
}

export async function globalSearch(query: string): Promise<SearchResult[]> {
  if (!query || query.length < 2) return [];
  let organizationId: string;
  try {
    organizationId = await requireOrgId();
  } catch {
    return [];
  }

  const results: SearchResult[] = [];

  const [clients, contacts, campaigns, suppliers] = await Promise.all([
    db.client.findMany({
      where: {
        organizationId,
        name: { contains: query, mode: "insensitive" },
      },
      take: 5,
      select: {
        id: true,
        slug: true,
        name: true,
        industry: true,
        initials: true,
        colour: true,
        bgColour: true,
      },
    }),
    db.contact.findMany({
      where: {
        organizationId,
        OR: [
          { name: { contains: query, mode: "insensitive" } },
          { outlet: { contains: query, mode: "insensitive" } },
        ],
      },
      take: 5,
      select: {
        id: true,
        slug: true,
        name: true,
        outlet: true,
        initials: true,
        avatarBg: true,
        avatarFg: true,
        photo: true,
      },
    }),
    db.campaign.findMany({
      where: {
        organizationId,
        name: { contains: query, mode: "insensitive" },
      },
      take: 5,
      select: {
        id: true,
        slug: true,
        name: true,
        client: { select: { name: true } },
      },
    }),
    db.supplier.findMany({
      where: {
        organizationId,
        name: { contains: query, mode: "insensitive" },
      },
      take: 5,
      select: { id: true, slug: true, name: true, serviceCategory: true },
    }),
  ]);

  clients.forEach((c) =>
    results.push({
      type: "client",
      id: c.id,
      title: c.name,
      subtitle: c.industry,
      href: `/clients/${c.slug}`,
      initials: c.initials,
      colour: c.colour,
      bgColour: c.bgColour,
    })
  );
  contacts.forEach((c) =>
    results.push({
      type: "contact",
      id: c.id,
      title: c.name,
      subtitle: c.outlet ?? "",
      href: `/contacts/${c.slug}`,
      initials: c.initials,
      colour: c.avatarFg,
      bgColour: c.avatarBg,
      photo: c.photo,
    })
  );
  campaigns.forEach((c) =>
    results.push({
      type: "campaign",
      id: c.id,
      title: c.name,
      subtitle: c.client.name,
      href: `/campaigns/${c.slug}`,
    })
  );
  suppliers.forEach((s) =>
    results.push({
      type: "supplier",
      id: s.id,
      title: s.name,
      subtitle: s.serviceCategory,
      href: `/suppliers/${s.slug}`,
    })
  );

  return results.slice(0, 15);
}
