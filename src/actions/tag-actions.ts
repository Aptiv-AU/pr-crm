"use server";

import { db } from "@/lib/db";
import { action } from "@/lib/server/action";

async function orgId() {
  const org = await db.organization.findFirst();
  if (!org) throw new Error("no org");
  return org.id;
}

export const createTag = action("createTag", async (label: string, colorBg?: string) => {
  if (!label.trim()) throw new Error("Label required");
  const organizationId = await orgId();
  const tag = await db.contactTag.create({
    data: { organizationId, label: label.trim(), colorBg: colorBg ?? "#374151" },
  });
  return { data: { tag }, revalidate: ["/contacts"] };
});

export const deleteTag = action("deleteTag", async (tagId: string) => {
  await db.contactTag.delete({ where: { id: tagId } });
  return { revalidate: ["/contacts"] };
});

export const assignTag = action("assignTag", async (contactId: string, tagId: string) => {
  await db.contactTagAssignment.upsert({
    where: { contactId_tagId: { contactId, tagId } },
    create: { contactId, tagId },
    update: {},
  });
  return { revalidate: [`/contacts/${contactId}`] };
});

export const removeTag = action("removeTag", async (contactId: string, tagId: string) => {
  await db.contactTagAssignment.deleteMany({ where: { contactId, tagId } });
  return { revalidate: [`/contacts/${contactId}`] };
});
