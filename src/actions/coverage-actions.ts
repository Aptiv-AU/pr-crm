"use server";

import { db } from "@/lib/db";
import { action } from "@/lib/server/action";
import { requireOrgId } from "@/lib/server/org";
import { generateSlug } from "@/lib/slug/generate";

async function assertOptionalCampaignInOrg(
  campaignId: string | null,
  orgId: string
): Promise<void> {
  if (!campaignId) return;
  const found = await db.campaign.findFirst({
    where: { id: campaignId, organizationId: orgId },
    select: { id: true },
  });
  if (!found) throw new Error("Campaign not found");
}

async function assertOptionalContactInOrg(
  contactId: string | null,
  orgId: string
): Promise<void> {
  if (!contactId) return;
  const found = await db.contact.findFirst({
    where: { id: contactId, organizationId: orgId },
    select: { id: true },
  });
  if (!found) throw new Error("Contact not found");
}

export const createCoverage = action("createCoverage", async (formData: FormData) => {
  const campaignId = formData.get("campaignId") as string | null;
  const contactId = formData.get("contactId") as string | null;
  const publication = formData.get("publication") as string | null;
  const dateStr = formData.get("date") as string | null;
  const type = formData.get("type") as string | null;
  const url = formData.get("url") as string | null;
  const mediaValueStr = formData.get("mediaValue") as string | null;
  const attachmentUrl = formData.get("attachmentUrl") as string | null;
  const notes = formData.get("notes") as string | null;

  if (!publication || !dateStr || !type) {
    throw new Error("Publication, date, and type are required");
  }

  const organizationId = await requireOrgId();
  await Promise.all([
    assertOptionalCampaignInOrg(campaignId, organizationId),
    assertOptionalContactInOrg(contactId, organizationId),
  ]);

  const mediaValue = mediaValueStr ? parseFloat(mediaValueStr) : null;

  const slug = await generateSlug("coverage", organizationId, publication);

  const coverage = await db.coverage.create({
    data: {
      organizationId,
      campaignId: campaignId || null,
      contactId: contactId || null,
      publication,
      slug,
      date: new Date(dateStr),
      type,
      url: url || null,
      mediaValue: mediaValue && !isNaN(mediaValue) ? mediaValue : null,
      attachmentUrl: attachmentUrl || null,
      notes: notes || null,
    },
  });

  const revalidate = ["/coverage"];
  if (campaignId) revalidate.push(`/campaigns/${campaignId}`);

  const revalidateTags: string[] = [];
  if (campaignId) revalidateTags.push(`campaign:${campaignId}`);
  if (contactId) revalidateTags.push(`contact:${contactId}`);

  return {
    data: { coverageId: coverage.id },
    revalidate,
    revalidateTags,
  };
});

export const updateCoverage = action(
  "updateCoverage",
  async (coverageId: string, formData: FormData) => {
    const organizationId = await requireOrgId();

    const campaignId = formData.get("campaignId") as string | null;
    const contactId = formData.get("contactId") as string | null;
    const publication = formData.get("publication") as string | null;
    const dateStr = formData.get("date") as string | null;
    const type = formData.get("type") as string | null;
    const url = formData.get("url") as string | null;
    const mediaValueStr = formData.get("mediaValue") as string | null;
    const attachmentUrl = formData.get("attachmentUrl") as string | null;
    const notes = formData.get("notes") as string | null;

    if (!publication || !dateStr || !type) {
      throw new Error("Publication, date, and type are required");
    }

    const existing = await db.coverage.findFirst({
      where: { id: coverageId, organizationId },
      select: { id: true, campaignId: true, contactId: true },
    });
    if (!existing) throw new Error("Coverage not found");

    await Promise.all([
      assertOptionalCampaignInOrg(campaignId, organizationId),
      assertOptionalContactInOrg(contactId, organizationId),
    ]);

    const mediaValue = mediaValueStr ? parseFloat(mediaValueStr) : null;

    await db.coverage.update({
      where: { id: coverageId },
      data: {
        campaignId: campaignId || null,
        contactId: contactId || null,
        publication,
        date: new Date(dateStr),
        type,
        url: url || null,
        mediaValue: mediaValue && !isNaN(mediaValue) ? mediaValue : null,
        attachmentUrl: attachmentUrl || null,
        notes: notes || null,
      },
    });

    const revalidate = ["/coverage"];
    if (campaignId) revalidate.push(`/campaigns/${campaignId}`);

    const revalidateTags = new Set<string>();
    if (existing.campaignId) revalidateTags.add(`campaign:${existing.campaignId}`);
    if (campaignId) revalidateTags.add(`campaign:${campaignId}`);
    if (existing.contactId) revalidateTags.add(`contact:${existing.contactId}`);
    if (contactId) revalidateTags.add(`contact:${contactId}`);

    return { revalidate, revalidateTags: Array.from(revalidateTags) };
  }
);

export const deleteCoverage = action("deleteCoverage", async (coverageId: string) => {
  const organizationId = await requireOrgId();
  const existing = await db.coverage.findFirst({
    where: { id: coverageId, organizationId },
    select: { campaignId: true, contactId: true },
  });

  if (!existing) {
    throw new Error("Coverage not found");
  }

  await db.coverage.delete({
    where: { id: coverageId },
  });

  const revalidate = ["/coverage"];
  if (existing.campaignId) revalidate.push(`/campaigns/${existing.campaignId}`);

  const revalidateTags: string[] = [];
  if (existing.campaignId) revalidateTags.push(`campaign:${existing.campaignId}`);
  if (existing.contactId) revalidateTags.push(`contact:${existing.contactId}`);

  return { revalidate, revalidateTags };
});
