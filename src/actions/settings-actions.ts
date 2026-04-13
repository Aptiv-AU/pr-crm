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

export async function updateOrganizationSettings(formData: FormData) {
  const organizationId = await getOrganizationId();
  const name = formData.get("name") as string | null;
  const currency = formData.get("currency") as string | null;

  await db.organization.update({
    where: { id: organizationId },
    data: {
      ...(name ? { name } : {}),
      ...(currency ? { currency } : {}),
    },
  });

  revalidatePath("/settings");
}
