"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

async function getOrganizationId(): Promise<string> {
  const org = await db.organization.findFirst();

  if (!org) {
    throw new Error("Organization not found");
  }

  return org.id;
}

export async function createContact(formData: FormData) {
  try {
    const name = formData.get("name") as string | null;
    const email = formData.get("email") as string | null;
    const phone = formData.get("phone") as string | null;
    const publication = formData.get("publication") as string | null;
    const beat = formData.get("beat") as string | null;
    const tier = formData.get("tier") as string | null;
    const initials = formData.get("initials") as string | null;
    const avatarBg = formData.get("avatarBg") as string | null;
    const avatarFg = formData.get("avatarFg") as string | null;
    const instagram = formData.get("instagram") as string | null;
    const twitter = formData.get("twitter") as string | null;
    const linkedin = formData.get("linkedin") as string | null;
    const notes = formData.get("notes") as string | null;

    if (
      !name ||
      !publication ||
      !beat ||
      !tier ||
      !initials ||
      !avatarBg ||
      !avatarFg
    ) {
      return { error: "All required fields must be provided" };
    }

    const organizationId = await getOrganizationId();

    const contact = await db.contact.create({
      data: {
        organizationId,
        name,
        email: email || null,
        phone: phone || null,
        publication,
        beat,
        tier,
        health: "warm",
        initials: initials.toUpperCase().slice(0, 2),
        avatarBg,
        avatarFg,
        instagram: instagram || null,
        twitter: twitter || null,
        linkedin: linkedin || null,
        notes: notes || null,
      },
    });

    revalidatePath("/contacts");

    return { success: true, contactId: contact.id };
  } catch (error) {
    console.error("createContact error:", error);
    return {
      error: error instanceof Error ? error.message : "Failed to create contact",
    };
  }
}

export async function updateContact(contactId: string, formData: FormData) {
  try {
    const name = formData.get("name") as string | null;
    const email = formData.get("email") as string | null;
    const phone = formData.get("phone") as string | null;
    const publication = formData.get("publication") as string | null;
    const beat = formData.get("beat") as string | null;
    const tier = formData.get("tier") as string | null;
    const health = formData.get("health") as string | null;
    const initials = formData.get("initials") as string | null;
    const avatarBg = formData.get("avatarBg") as string | null;
    const avatarFg = formData.get("avatarFg") as string | null;
    const instagram = formData.get("instagram") as string | null;
    const twitter = formData.get("twitter") as string | null;
    const linkedin = formData.get("linkedin") as string | null;
    const notes = formData.get("notes") as string | null;

    if (
      !name ||
      !publication ||
      !beat ||
      !tier ||
      !health ||
      !initials ||
      !avatarBg ||
      !avatarFg
    ) {
      return { error: "All required fields must be provided" };
    }

    await db.contact.update({
      where: { id: contactId },
      data: {
        name,
        email: email || null,
        phone: phone || null,
        publication,
        beat,
        tier,
        health,
        initials: initials.toUpperCase().slice(0, 2),
        avatarBg,
        avatarFg,
        instagram: instagram || null,
        twitter: twitter || null,
        linkedin: linkedin || null,
        notes: notes || null,
      },
    });

    revalidatePath("/contacts");
    revalidatePath(`/contacts/${contactId}`);

    return { success: true };
  } catch (error) {
    console.error("updateContact error:", error);
    return {
      error:
        error instanceof Error ? error.message : "Failed to update contact",
    };
  }
}
