"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

async function getOrganizationId(): Promise<string> {
  const org = await db.organization.findFirst();
  if (!org) throw new Error("Organization not found");
  return org.id;
}

export async function updateAISettings(formData: FormData) {
  const organizationId = await getOrganizationId();
  const aiProvider = formData.get("aiProvider") as string | null;
  const aiModel = formData.get("aiModel") as string | null;

  await db.organization.update({
    where: { id: organizationId },
    data: {
      aiProvider: aiProvider || null,
      aiModel: aiModel || null,
    },
  });

  revalidatePath("/settings");
}

export async function updateUserProfile(userId: string, formData: FormData) {
  const name = formData.get("name") as string | null;
  if (!name) return { error: "Name is required" };

  await db.user.update({
    where: { id: userId },
    data: { name },
  });

  revalidatePath("/settings");
  revalidatePath("/");
  return { success: true };
}

export async function updateOrganizationSettings(formData: FormData) {
  const organizationId = await getOrganizationId();
  const name = formData.get("name") as string | null;
  const currency = formData.get("currency") as string | null;
  const logo = formData.get("logo") as string | null;

  await db.organization.update({
    where: { id: organizationId },
    data: {
      ...(name ? { name } : {}),
      ...(currency ? { currency } : {}),
      logo: logo || null,
    },
  });

  revalidatePath("/settings");
}
