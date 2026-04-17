"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { slugify, ensureUniqueSlug } from "@/lib/slug/slugify";

async function getOrganizationId(): Promise<string> {
  const org = await db.organization.findFirst();

  if (org) return org.id;

  const newOrg = await db.organization.create({
    data: {
      name: "NWPR",
      currency: "AUD",
    },
  });

  return newOrg.id;
}

export async function createClient(formData: FormData) {
  try {
    const name = formData.get("name") as string | null;
    const industry = formData.get("industry") as string | null;
    const colour = formData.get("colour") as string | null;
    const bgColour = formData.get("bgColour") as string | null;
    const initials = formData.get("initials") as string | null;
    const logo = formData.get("logo") as string | null;

    if (!name || !industry || !colour || !bgColour || !initials) {
      return { error: "All fields are required" };
    }

    const organizationId = await getOrganizationId();

    const slug = await ensureUniqueSlug(slugify(name), async (candidate) => {
      const existing = await db.client.findFirst({
        where: { organizationId, slug: candidate },
        select: { id: true },
      });
      return existing !== null;
    });

    const client = await db.client.create({
      data: {
        organizationId,
        name,
        slug,
        industry,
        colour,
        bgColour,
        initials: initials.toUpperCase().slice(0, 2),
        logo: logo || null,
      },
    });

    revalidatePath("/workspaces");

    return { success: true, clientId: client.id };
  } catch (error) {
    console.error("createClient error:", error);
    return { error: error instanceof Error ? error.message : "Failed to create client" };
  }
}

export async function updateClient(clientId: string, formData: FormData) {
  try {
    const name = formData.get("name") as string | null;
    const industry = formData.get("industry") as string | null;
    const colour = formData.get("colour") as string | null;
    const bgColour = formData.get("bgColour") as string | null;
    const initials = formData.get("initials") as string | null;
    const logo = formData.get("logo") as string | null;

    if (!name || !industry || !colour || !bgColour || !initials) {
      return { error: "All fields are required" };
    }

    await db.client.update({
      where: { id: clientId },
      data: {
        name,
        industry,
        colour,
        bgColour,
        initials: initials.toUpperCase().slice(0, 2),
        logo: logo || null,
      },
    });

    revalidatePath("/workspaces");
    revalidatePath(`/workspaces/${clientId}`);

    return { success: true };
  } catch (error) {
    console.error("updateClient error:", error);
    return { error: error instanceof Error ? error.message : "Failed to update client" };
  }
}

export async function archiveClient(clientId: string) {
  try {
    await db.$transaction([
      db.client.update({
        where: { id: clientId },
        data: { archivedAt: new Date() },
      }),
      db.campaign.updateMany({
        where: { clientId },
        data: { archivedAt: new Date() },
      }),
    ]);

    revalidatePath("/workspaces");
    revalidatePath("/campaigns");
    return { success: true };
  } catch (error) {
    console.error("archiveClient error:", error);
    return { error: error instanceof Error ? error.message : "Failed to archive client" };
  }
}

export async function restoreClient(clientId: string) {
  try {
    await db.$transaction([
      db.client.update({
        where: { id: clientId },
        data: { archivedAt: null },
      }),
      db.campaign.updateMany({
        where: { clientId },
        data: { archivedAt: null },
      }),
    ]);
    revalidatePath("/workspaces");
    revalidatePath("/campaigns");
    return { success: true };
  } catch (error) {
    console.error("restoreClient error:", error);
    return { error: error instanceof Error ? error.message : "Failed to restore client" };
  }
}
