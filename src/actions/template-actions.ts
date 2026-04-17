"use server";

import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { renderTemplate } from "@/lib/templates/render";

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

export async function applyTemplateToOutreach(outreachId: string, templateId: string) {
  try {
    const outreach = await db.outreach.findUnique({
      where: { id: outreachId },
      include: {
        contact: true,
        campaign: { include: { client: true } },
      },
    });
    if (!outreach) return { error: "Outreach not found" };

    const template = await db.emailTemplate.findUnique({ where: { id: templateId } });
    if (!template) return { error: "Template not found" };

    const session = await auth();
    const senderName =
      session?.user?.name ?? session?.user?.email?.split("@")[0] ?? "Sender";

    const ctx = {
      contact: {
        name: outreach.contact.name,
        outlet: outreach.contact.outlet,
        beat: outreach.contact.beat,
      },
      client: { name: outreach.campaign.client.name },
      campaign: { name: outreach.campaign.name },
      sender: { name: senderName },
    };

    const subject = renderTemplate(template.subject, ctx);
    const body = renderTemplate(template.body, ctx);

    await db.outreach.update({
      where: { id: outreachId },
      data: { subject, body },
    });

    revalidatePath(`/campaigns/${outreach.campaignId}`);
    return { success: true, subject, body };
  } catch (error) {
    console.error("applyTemplateToOutreach error:", error);
    return { error: error instanceof Error ? error.message : "Failed to apply template" };
  }
}
