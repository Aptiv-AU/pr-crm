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

export const createClientContact = action(
  "createClientContact",
  async (formData: FormData) => {
    const clientId = formData.get("clientId") as string | null;
    const name = formData.get("name") as string | null;
    const role = formData.get("role") as string | null;
    const email = formData.get("email") as string | null;
    const phone = formData.get("phone") as string | null;
    const notes = formData.get("notes") as string | null;
    const isPrimary = formData.get("isPrimary") === "true";

    if (!clientId || !name) {
      throw new Error("Client and contact name are required");
    }

    const organizationId = await requireOrgId();
    await assertClientInOrg(clientId, organizationId);

    if (isPrimary) {
      await db.clientContact.updateMany({
        where: { clientId, isPrimary: true },
        data: { isPrimary: false },
      });
    }

    await db.clientContact.create({
      data: {
        clientId,
        name,
        role: role || null,
        email: email || null,
        phone: phone || null,
        notes: notes || null,
        isPrimary,
      },
    });

    return { revalidate: [`/clients/${clientId}`] };
  }
);

export const updateClientContact = action(
  "updateClientContact",
  async (clientContactId: string, formData: FormData) => {
    const name = formData.get("name") as string | null;
    const role = formData.get("role") as string | null;
    const email = formData.get("email") as string | null;
    const phone = formData.get("phone") as string | null;
    const notes = formData.get("notes") as string | null;
    const isPrimary = formData.get("isPrimary") === "true";

    if (!name) {
      throw new Error("Contact name is required");
    }

    const organizationId = await requireOrgId();
    const existing = await db.clientContact.findFirst({
      where: { id: clientContactId, client: { organizationId } },
      select: { clientId: true },
    });

    if (!existing) {
      throw new Error("Client contact not found");
    }

    if (isPrimary) {
      await db.clientContact.updateMany({
        where: {
          clientId: existing.clientId,
          isPrimary: true,
          id: { not: clientContactId },
        },
        data: { isPrimary: false },
      });
    }

    await db.clientContact.update({
      where: { id: clientContactId },
      data: {
        name,
        role: role || null,
        email: email || null,
        phone: phone || null,
        notes: notes || null,
        isPrimary,
      },
    });

    return { revalidate: [`/clients/${existing.clientId}`] };
  }
);

export const deleteClientContact = action(
  "deleteClientContact",
  async (clientContactId: string) => {
    const organizationId = await requireOrgId();
    const existing = await db.clientContact.findFirst({
      where: { id: clientContactId, client: { organizationId } },
      select: { clientId: true },
    });

    if (!existing) {
      throw new Error("Client contact not found");
    }

    await db.clientContact.delete({
      where: { id: clientContactId },
    });

    return { revalidate: [`/clients/${existing.clientId}`] };
  }
);

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
