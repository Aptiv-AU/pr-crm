"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import type { SegmentFilter } from "@/lib/segments/filter";

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
