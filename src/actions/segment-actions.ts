"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import type { SegmentFilter } from "@/lib/segments/filter";
import { getContactsByFilter } from "@/lib/queries/contact-queries";

async function orgId() {
  const org = await db.organization.findFirst();
  if (!org) throw new Error("no org");
  return org.id;
}

export async function createSegment(name: string, filter: SegmentFilter) {
  if (!name.trim()) return { error: "Name required" };
  const organizationId = await orgId();
  const seg = await db.contactSegment.create({
    data: { organizationId, name: name.trim(), filter: filter as object },
  });
  revalidatePath("/contacts");
  return { success: true, segment: seg };
}

export async function deleteSegment(id: string) {
  await db.contactSegment.delete({ where: { id } });
  revalidatePath("/contacts");
  return { success: true };
}

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
