"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

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

    if (!name || !industry || !colour || !bgColour || !initials) {
      return { error: "All fields are required" };
    }

    const organizationId = await getOrganizationId();

    const client = await db.client.create({
      data: {
        organizationId,
        name,
        industry,
        colour,
        bgColour,
        initials: initials.toUpperCase().slice(0, 2),
      },
    });

    revalidatePath("/workspaces");

    return { success: true, clientId: client.id };
  } catch (error) {
    return { error: "Failed to create client" };
  }
}

export async function updateClient(clientId: string, formData: FormData) {
  try {
    const name = formData.get("name") as string | null;
    const industry = formData.get("industry") as string | null;
    const colour = formData.get("colour") as string | null;
    const bgColour = formData.get("bgColour") as string | null;
    const initials = formData.get("initials") as string | null;

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
      },
    });

    revalidatePath("/workspaces");
    revalidatePath(`/workspaces/${clientId}`);

    return { success: true };
  } catch (error) {
    return { error: "Failed to update client" };
  }
}
