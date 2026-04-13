"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

async function getOrganizationId(): Promise<string> {
  const org = await db.organization.findFirst();

  if (!org) {
    throw new Error("Organization not found");
  }

  return org.id;
}

export async function createCoverage(formData: FormData) {
  try {
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
      return { error: "Publication, date, and type are required" };
    }

    const organizationId = await getOrganizationId();
    const mediaValue = mediaValueStr ? parseFloat(mediaValueStr) : null;

    const coverage = await db.coverage.create({
      data: {
        organizationId,
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

    revalidatePath("/coverage");
    if (campaignId) {
      revalidatePath(`/campaigns/${campaignId}`);
    }

    return { success: true, coverageId: coverage.id };
  } catch (error) {
    console.error("createCoverage error:", error);
    return {
      error: error instanceof Error ? error.message : "Failed to create coverage",
    };
  }
}

export async function updateCoverage(coverageId: string, formData: FormData) {
  try {
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
      return { error: "Publication, date, and type are required" };
    }

    const existing = await db.coverage.findUnique({
      where: { id: coverageId },
      select: { organizationId: true },
    });

    if (!existing) {
      return { error: "Coverage not found" };
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

    revalidatePath("/coverage");
    if (campaignId) {
      revalidatePath(`/campaigns/${campaignId}`);
    }

    return { success: true };
  } catch (error) {
    console.error("updateCoverage error:", error);
    return {
      error: error instanceof Error ? error.message : "Failed to update coverage",
    };
  }
}

export async function deleteCoverage(coverageId: string) {
  try {
    const existing = await db.coverage.findUnique({
      where: { id: coverageId },
      select: { campaignId: true },
    });

    if (!existing) {
      return { error: "Coverage not found" };
    }

    await db.coverage.delete({
      where: { id: coverageId },
    });

    revalidatePath("/coverage");
    if (existing.campaignId) {
      revalidatePath(`/campaigns/${existing.campaignId}`);
    }

    return { success: true };
  } catch (error) {
    console.error("deleteCoverage error:", error);
    return {
      error: error instanceof Error ? error.message : "Failed to delete coverage",
    };
  }
}
