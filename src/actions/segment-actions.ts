"use server";

import { db } from "@/lib/db";
import { action } from "@/lib/server/action";
import type { SegmentFilter } from "@/lib/segments/filter";
import { getContactsByFilter } from "@/lib/queries/contact-queries";

async function orgId() {
  const org = await db.organization.findFirst();
  if (!org) throw new Error("no org");
  return org.id;
}

export const createSegment = action(
  "createSegment",
  async (name: string, filter: SegmentFilter) => {
    if (!name.trim()) throw new Error("Name required");
    const organizationId = await orgId();
    const segment = await db.contactSegment.create({
      data: { organizationId, name: name.trim(), filter: filter as object },
    });
    return { data: { segment }, revalidate: ["/contacts"] };
  }
);

export const deleteSegment = action("deleteSegment", async (id: string) => {
  await db.contactSegment.delete({ where: { id } });
  return { revalidate: ["/contacts"] };
});

export async function applyFilter(filter: SegmentFilter) {
  const organizationId = await orgId();
  const contacts = await getContactsByFilter(organizationId, filter);
  return contacts.map((c) => ({
    id: c.id,
    name: c.name,
    initials: c.initials,
    avatarBg: c.avatarBg,
    avatarFg: c.avatarFg,
    photo: c.photo,
    publication: c.outlet ?? "",
    beat: c.beat ?? "",
    tier: c.tier ?? "",
    health: c.health,
    createdAt: c.createdAt.toISOString(),
    lastContactDate: null as string | null,
    tags: c.tags.map((a) => ({
      id: a.tag.id,
      label: a.tag.label,
      colorBg: a.tag.colorBg,
      colorFg: a.tag.colorFg,
    })),
  }));
}
