"use server";

import { db } from "@/lib/db";
import { action } from "@/lib/server/action";
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

export const createClient = action("createClient", async (formData: FormData) => {
  const name = formData.get("name") as string | null;
  const industry = formData.get("industry") as string | null;
  const colour = formData.get("colour") as string | null;
  const bgColour = formData.get("bgColour") as string | null;
  const initials = formData.get("initials") as string | null;
  const logo = formData.get("logo") as string | null;

  if (!name || !industry || !colour || !bgColour || !initials) {
    throw new Error("All fields are required");
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

  return { data: { clientId: client.id }, revalidate: ["/workspaces"] };
});

export const updateClient = action(
  "updateClient",
  async (clientId: string, formData: FormData) => {
    const name = formData.get("name") as string | null;
    const industry = formData.get("industry") as string | null;
    const colour = formData.get("colour") as string | null;
    const bgColour = formData.get("bgColour") as string | null;
    const initials = formData.get("initials") as string | null;
    const logo = formData.get("logo") as string | null;

    if (!name || !industry || !colour || !bgColour || !initials) {
      throw new Error("All fields are required");
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

    return { revalidate: ["/workspaces", `/workspaces/${clientId}`] };
  }
);

export const archiveClient = action("archiveClient", async (clientId: string) => {
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

  return { revalidate: ["/workspaces", "/campaigns"] };
});

export const restoreClient = action("restoreClient", async (clientId: string) => {
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
  return { revalidate: ["/workspaces", "/campaigns"] };
});
