"use server";

import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { requireOrgId } from "@/lib/server/org";

export async function updateAISettings(formData: FormData) {
  const organizationId = await requireOrgId();
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

export async function updateUserProfile(formData: FormData) {
  // S-6c: the session-derived userId is authoritative. Never accept a userId
  // from the caller — previously this function took a userId parameter and
  // an attacker could rename any user in the DB.
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized" };

  const name = formData.get("name") as string | null;
  if (!name) return { error: "Name is required" };

  await db.user.update({
    where: { id: session.user.id },
    data: { name },
  });

  revalidatePath("/settings");
  revalidatePath("/");
  return { success: true };
}

export async function updateOrganizationSettings(formData: FormData) {
  const organizationId = await requireOrgId();
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
