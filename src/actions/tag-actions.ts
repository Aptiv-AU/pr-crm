"use server";

import { db } from "@/lib/db";
import { action } from "@/lib/server/action";
import { requireOrgId } from "@/lib/server/org";

export const createTag = action("createTag", async (label: string, colorBg?: string) => {
  if (!label.trim()) throw new Error("Label required");
  const organizationId = await requireOrgId();
  const tag = await db.contactTag.create({
    data: { organizationId, label: label.trim(), colorBg: colorBg ?? "#374151" },
  });
  return { data: { tag }, revalidate: ["/contacts"] };
});

export const deleteTag = action("deleteTag", async (tagId: string) => {
  const organizationId = await requireOrgId();
  const existing = await db.contactTag.findFirst({
    where: { id: tagId, organizationId },
    select: { id: true },
  });
  if (!existing) throw new Error("Tag not found");

  await db.contactTag.delete({ where: { id: tagId } });
  return { revalidate: ["/contacts"] };
});

async function assertContactAndTagInOrg(
  contactId: string,
  tagId: string,
  orgId: string
): Promise<void> {
  const [contact, tag] = await Promise.all([
    db.contact.findFirst({
      where: { id: contactId, organizationId: orgId },
      select: { id: true },
    }),
    db.contactTag.findFirst({
      where: { id: tagId, organizationId: orgId },
      select: { id: true },
    }),
  ]);
  if (!contact) throw new Error("Contact not found");
  if (!tag) throw new Error("Tag not found");
}

export const assignTag = action("assignTag", async (contactId: string, tagId: string) => {
  const organizationId = await requireOrgId();
  await assertContactAndTagInOrg(contactId, tagId, organizationId);

  await db.contactTagAssignment.upsert({
    where: { contactId_tagId: { contactId, tagId } },
    create: { contactId, tagId },
    update: {},
  });
  return { revalidate: [`/contacts/${contactId}`] };
});

export const removeTag = action("removeTag", async (contactId: string, tagId: string) => {
  const organizationId = await requireOrgId();
  await assertContactAndTagInOrg(contactId, tagId, organizationId);

  await db.contactTagAssignment.deleteMany({ where: { contactId, tagId } });
  return { revalidate: [`/contacts/${contactId}`] };
});
