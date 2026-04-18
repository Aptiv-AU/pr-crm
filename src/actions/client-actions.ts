"use server";

import { db } from "@/lib/db";
import { action } from "@/lib/server/action";
import { requireOrgId } from "@/lib/server/org";
import { generateSlug } from "@/lib/slug/generate";

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

  const organizationId = await requireOrgId();

  const slug = await generateSlug("client", organizationId, name);

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

  return {
    data: { clientId: client.id },
    revalidate: ["/clients"],
    revalidateTags: [
      `clients:${organizationId}`,
      `campaigns:${organizationId}`,
    ],
  };
});

async function assertClientInOrg(clientId: string, orgId: string): Promise<void> {
  const found = await db.client.findFirst({
    where: { id: clientId, organizationId: orgId },
    select: { id: true },
  });
  if (!found) throw new Error("Client not found");
}

export const updateClient = action(
  "updateClient",
  async (clientId: string, formData: FormData) => {
    const organizationId = await requireOrgId();
    await assertClientInOrg(clientId, organizationId);

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

    return {
      revalidate: ["/clients", `/clients/${clientId}`],
      revalidateTags: [
        `clients:${organizationId}`,
        `campaigns:${organizationId}`,
      ],
    };
  }
);

export const archiveClient = action("archiveClient", async (clientId: string) => {
  const organizationId = await requireOrgId();
  await assertClientInOrg(clientId, organizationId);

  await db.$transaction([
    db.client.update({
      where: { id: clientId },
      data: { archivedAt: new Date() },
    }),
    db.campaign.updateMany({
      where: { clientId, organizationId },
      data: { archivedAt: new Date() },
    }),
  ]);

  return {
    revalidate: ["/clients", "/campaigns"],
    revalidateTags: [
      `clients:${organizationId}`,
      `campaigns:${organizationId}`,
      `stats:${organizationId}`,
    ],
  };
});

export const restoreClient = action("restoreClient", async (clientId: string) => {
  const organizationId = await requireOrgId();
  await assertClientInOrg(clientId, organizationId);

  await db.$transaction([
    db.client.update({
      where: { id: clientId },
      data: { archivedAt: null },
    }),
    db.campaign.updateMany({
      where: { clientId, organizationId },
      data: { archivedAt: null },
    }),
  ]);
  return {
    revalidate: ["/clients", "/campaigns"],
    revalidateTags: [
      `clients:${organizationId}`,
      `campaigns:${organizationId}`,
      `stats:${organizationId}`,
    ],
  };
});
