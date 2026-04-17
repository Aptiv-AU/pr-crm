"use server";

import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";

async function orgId() {
  const org = await db.organization.findFirst();
  if (!org) throw new Error("no org");
  return org.id;
}

export async function addSuppression({
  email,
  reason,
  note,
}: {
  email: string;
  reason: "reply_request" | "manual";
  note?: string;
}) {
  try {
    const session = await auth();
    const organizationId = await orgId();
    const normalised = email.trim().toLowerCase();
    if (!normalised) return { error: "Email required" };

    await db.suppression.upsert({
      where: { organizationId_email: { organizationId, email: normalised } },
      create: {
        organizationId,
        email: normalised,
        reason,
        note,
        createdByUserId: session?.user?.id ?? null,
      },
      update: { reason, note },
    });
    revalidatePath("/settings/suppressions");
    return { success: true };
  } catch (error) {
    console.error("addSuppression error:", error);
    return { error: error instanceof Error ? error.message : "Failed to add suppression" };
  }
}

export async function removeSuppression(id: string) {
  try {
    await db.suppression.delete({ where: { id } });
    revalidatePath("/settings/suppressions");
    return { success: true };
  } catch (error) {
    console.error("removeSuppression error:", error);
    return { error: error instanceof Error ? error.message : "Failed to remove suppression" };
  }
}

export async function listSuppressions() {
  const organizationId = await orgId();
  return db.suppression.findMany({
    where: { organizationId },
    orderBy: { createdAt: "desc" },
  });
}
