"use server";

import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { revalidatePath, revalidateTag } from "next/cache";
import { requireOrgId } from "@/lib/server/org";
import { requireRole } from "@/lib/server/role";

export async function updateAISettings(formData: FormData) {
  const organizationId = await requireOrgId();
  await requireRole(["owner", "admin"]);
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
  // W6: org row is cached in `getCurrentOrg()` / `getOrgById()` under
  // `org:${orgId}` — bust it so branding/AI config is read fresh.
  revalidateTag(`org:${organizationId}`, "max");
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
  await requireRole(["owner", "admin"]);
  const name = formData.get("name") as string | null;
  const currency = formData.get("currency") as string | null;
  const logo = formData.get("logo") as string | null;
  const locale = formData.get("locale") as string | null;
  const timezone = formData.get("timezone") as string | null;

  await db.organization.update({
    where: { id: organizationId },
    data: {
      ...(name ? { name } : {}),
      ...(currency ? { currency } : {}),
      ...(locale ? { locale } : {}),
      ...(timezone ? { timezone } : {}),
      logo: logo || null,
    },
  });

  revalidatePath("/settings");
  revalidatePath("/", "layout");
  revalidateTag(`org:${organizationId}`, "max");
}
