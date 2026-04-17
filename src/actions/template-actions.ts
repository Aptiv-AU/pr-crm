"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

async function orgId() {
  const org = await db.organization.findFirst();
  if (!org) throw new Error("no org");
  return org.id;
}

export async function createTemplate(data: { name: string; subject: string; body: string }) {
  try {
    const organizationId = await orgId();
    await db.emailTemplate.create({ data: { organizationId, ...data } });
    revalidatePath("/settings/templates");
    return { success: true };
  } catch (error) {
    console.error("createTemplate error:", error);
    return { error: error instanceof Error ? error.message : "Failed to create template" };
  }
}

export async function updateTemplate(
  id: string,
  data: { name: string; subject: string; body: string }
) {
  try {
    await db.emailTemplate.update({ where: { id }, data });
    revalidatePath("/settings/templates");
    return { success: true };
  } catch (error) {
    console.error("updateTemplate error:", error);
    return { error: error instanceof Error ? error.message : "Failed to update template" };
  }
}

export async function deleteTemplate(id: string) {
  try {
    await db.emailTemplate.delete({ where: { id } });
    revalidatePath("/settings/templates");
    return { success: true };
  } catch (error) {
    console.error("deleteTemplate error:", error);
    return { error: error instanceof Error ? error.message : "Failed to delete template" };
  }
}

export async function listTemplates() {
  const organizationId = await orgId();
  return db.emailTemplate.findMany({
    where: { organizationId },
    orderBy: { name: "asc" },
  });
}
