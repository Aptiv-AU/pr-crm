"use server";

import { db } from "@/lib/db";
import { action } from "@/lib/server/action";
import { slugify, ensureUniqueSlug } from "@/lib/slug/slugify";

async function getOrganizationId(): Promise<string> {
  const org = await db.organization.findFirst();

  if (!org) {
    throw new Error("Organization not found");
  }

  return org.id;
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

  const organizationId = await getOrganizationId();
  const mediaValue = mediaValueStr ? parseFloat(mediaValueStr) : null;

  const slug = await ensureUniqueSlug(slugify(publication), async (candidate) => {
    const existing = await db.coverage.findFirst({
      where: { organizationId, slug: candidate },
      select: { id: true },
    });
    return existing !== null;
  });

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

  return { data: { coverageId: coverage.id }, revalidate };
});

export const updateCoverage = action(
  "updateCoverage",
  async (coverageId: string, formData: FormData) => {
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

    const existing = await db.coverage.findUnique({
      where: { id: coverageId },
      select: { organizationId: true },
    });

    if (!existing) {
      throw new Error("Coverage not found");
    }

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

    return { revalidate };
  }
);

export const deleteCoverage = action("deleteCoverage", async (coverageId: string) => {
  const existing = await db.coverage.findUnique({
    where: { id: coverageId },
    select: { campaignId: true },
  });

  if (!existing) {
    throw new Error("Coverage not found");
  }

  await db.coverage.delete({
    where: { id: coverageId },
  });

  const revalidate = ["/coverage"];
  if (existing.campaignId) revalidate.push(`/campaigns/${existing.campaignId}`);

  return { revalidate };
});
