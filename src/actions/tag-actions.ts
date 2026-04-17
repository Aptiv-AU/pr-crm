"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

async function orgId() {
  const org = await db.organization.findFirst();
  if (!org) throw new Error("no org");
  return org.id;
}

export async function createTag(label: string, colorBg?: string) {
  if (!label.trim()) return { error: "Label required" };
  const organizationId = await orgId();
  const tag = await db.contactTag.create({
    data: { organizationId, label: label.trim(), colorBg: colorBg ?? "#374151" },
  });
  revalidatePath("/contacts");
  return { success: true, tag };
}

export async function deleteTag(tagId: string) {
  await db.contactTag.delete({ where: { id: tagId } });
  revalidatePath("/contacts");
  return { success: true };
}

export async function assignTag(contactId: string, tagId: string) {
  await db.contactTagAssignment.upsert({
    where: { contactId_tagId: { contactId, tagId } },
    create: { contactId, tagId },
    update: {},
  });
  revalidatePath(`/contacts/${contactId}`);
  return { success: true };
}

export async function removeTag(contactId: string, tagId: string) {
  await db.contactTagAssignment.deleteMany({ where: { contactId, tagId } });
  revalidatePath(`/contacts/${contactId}`);
  return { success: true };
}
