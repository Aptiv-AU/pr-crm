"use server";

import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { action } from "@/lib/server/action";
import { requireOrgId } from "@/lib/server/org";
import { renderTemplate } from "@/lib/templates/render";

export const createTemplate = action(
  "createTemplate",
  async (data: { name: string; subject: string; body: string }) => {
    const organizationId = await requireOrgId();
    await db.emailTemplate.create({ data: { organizationId, ...data } });
    return { revalidate: ["/settings/templates"] };
  }
);

export const updateTemplate = action(
  "updateTemplate",
  async (id: string, data: { name: string; subject: string; body: string }) => {
    const organizationId = await requireOrgId();
    const existing = await db.emailTemplate.findFirst({
      where: { id, organizationId },
      select: { id: true },
    });
    if (!existing) throw new Error("Template not found");

    await db.emailTemplate.update({ where: { id }, data });
    return { revalidate: ["/settings/templates"] };
  }
);

export const deleteTemplate = action("deleteTemplate", async (id: string) => {
  const organizationId = await requireOrgId();
  const existing = await db.emailTemplate.findFirst({
    where: { id, organizationId },
    select: { id: true },
  });
  if (!existing) throw new Error("Template not found");

  await db.emailTemplate.delete({ where: { id } });
  return { revalidate: ["/settings/templates"] };
});

export async function listTemplates() {
  const organizationId = await requireOrgId();
  return db.emailTemplate.findMany({
    where: { organizationId },
    orderBy: { name: "asc" },
  });
}

export const applyTemplateToOutreach = action(
  "applyTemplateToOutreach",
  async (outreachId: string, templateId: string) => {
    const organizationId = await requireOrgId();

    const outreach = await db.outreach.findFirst({
      where: { id: outreachId, campaign: { organizationId } },
      include: {
        contact: true,
        campaign: { include: { client: true } },
      },
    });
    if (!outreach) throw new Error("Outreach not found");

    const template = await db.emailTemplate.findFirst({
      where: { id: templateId, organizationId },
    });
    if (!template) throw new Error("Template not found");

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

    return {
      data: { subject, body },
      revalidate: [`/campaigns/${outreach.campaignId}`],
    };
  }
);
