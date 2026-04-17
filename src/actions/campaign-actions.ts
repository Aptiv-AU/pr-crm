"use server";

import { db } from "@/lib/db";
import { action } from "@/lib/server/action";
import { requireOrgId } from "@/lib/server/org";
import { generateSlug } from "@/lib/slug/generate";

const PHASE_TEMPLATES: Record<string, string[]> = {
  press: ["Draft Pitches", "Outreach", "Coverage"],
  event: ["Planning", "Invite List", "Send Invitations", "Track RSVPs", "Logistics & Runsheet", "Post-event Follow-up"],
  gifting: ["Select Products", "Build Send List", "Ship & Track", "Follow-up", "Coverage Tracking"],
};

async function assertCampaignInOrg(campaignId: string, orgId: string): Promise<void> {
  const found = await db.campaign.findFirst({
    where: { id: campaignId, organizationId: orgId },
    select: { id: true },
  });
  if (!found) throw new Error("Campaign not found");
}

export const createCampaign = action("createCampaign", async (formData: FormData) => {
  const name = formData.get("name") as string | null;
  const type = formData.get("type") as string | null;
  const clientId = formData.get("clientId") as string | null;
  const budgetStr = formData.get("budget") as string | null;
  const startDateStr = formData.get("startDate") as string | null;
  const dueDateStr = formData.get("dueDate") as string | null;
  const brief = formData.get("brief") as string | null;

  if (!name || !type || !clientId) {
    throw new Error("Name, type, and client are required");
  }

  const organizationId = await requireOrgId();

  // Ensure the client belongs to the caller's org.
  const client = await db.client.findFirst({
    where: { id: clientId, organizationId },
    select: { id: true },
  });
  if (!client) throw new Error("Client not found");

  const budget = budgetStr ? parseFloat(budgetStr) : null;
  const startDate = startDateStr ? new Date(startDateStr) : null;
  const dueDate = dueDateStr ? new Date(dueDateStr) : null;

  const phases = PHASE_TEMPLATES[type] || [];
  const firstPhaseName = phases[0] || null;

  const slug = await generateSlug("campaign", organizationId, name);

  const campaign = await db.campaign.create({
    data: {
      organizationId,
      clientId,
      name,
      slug,
      type,
      status: "draft",
      currentPhase: firstPhaseName,
      budget: budget !== null && !isNaN(budget) ? budget : null,
      startDate,
      dueDate,
      brief: brief || null,
      phases: {
        create: phases.map((phaseName, index) => ({
          name: phaseName,
          order: index + 1,
          status: index === 0 ? "active" : "pending",
        })),
      },
    },
  });

  return {
    data: { campaignId: campaign.id },
    revalidate: ["/campaigns", "/workspaces"],
  };
});

export const updateCampaign = action(
  "updateCampaign",
  async (campaignId: string, formData: FormData) => {
    const orgId = await requireOrgId();
    await assertCampaignInOrg(campaignId, orgId);

    const name = formData.get("name") as string | null;
    const status = formData.get("status") as string | null;
    const budgetStr = formData.get("budget") as string | null;
    const startDateStr = formData.get("startDate") as string | null;
    const dueDateStr = formData.get("dueDate") as string | null;
    const brief = formData.get("brief") as string | null;

    const budget = budgetStr ? parseFloat(budgetStr) : null;
    const startDate = startDateStr ? new Date(startDateStr) : null;
    const dueDate = dueDateStr ? new Date(dueDateStr) : null;

    await db.campaign.update({
      where: { id: campaignId },
      data: {
        ...(name ? { name } : {}),
        ...(status ? { status } : {}),
        budget: budget !== null && !isNaN(budget) ? budget : null,
        startDate,
        dueDate,
        brief: brief || null,
      },
    });

    return {
      revalidate: ["/campaigns", `/campaigns/${campaignId}`, "/workspaces"],
    };
  }
);

export const addContactToCampaign = action(
  "addContactToCampaign",
  async (campaignId: string, contactId: string) => {
    const orgId = await requireOrgId();
    // Both campaign and contact must live in the caller's org.
    const [campaign, contact] = await Promise.all([
      db.campaign.findFirst({
        where: { id: campaignId, organizationId: orgId },
        select: { id: true },
      }),
      db.contact.findFirst({
        where: { id: contactId, organizationId: orgId },
        select: { id: true },
      }),
    ]);
    if (!campaign) throw new Error("Campaign not found");
    if (!contact) throw new Error("Contact not found");

    await db.campaignContact.create({
      data: {
        campaignId,
        contactId,
        status: "added",
      },
    });

    return { revalidate: ["/campaigns", `/campaigns/${campaignId}`] };
  }
);

export const removeContactFromCampaign = action(
  "removeContactFromCampaign",
  async (campaignContactId: string) => {
    const orgId = await requireOrgId();
    const existing = await db.campaignContact.findFirst({
      where: { id: campaignContactId, campaign: { organizationId: orgId } },
      select: { campaignId: true },
    });

    if (!existing) {
      throw new Error("Campaign contact not found");
    }

    await db.campaignContact.delete({
      where: { id: campaignContactId },
    });

    return {
      revalidate: ["/campaigns", `/campaigns/${existing.campaignId}`],
    };
  }
);

export const completeCampaign = action("completeCampaign", async (campaignId: string) => {
  const orgId = await requireOrgId();
  await assertCampaignInOrg(campaignId, orgId);
  await db.campaign.update({
    where: { id: campaignId },
    data: { status: "complete" },
  });
  return { revalidate: ["/campaigns", `/campaigns/${campaignId}`] };
});

export const reopenCampaign = action("reopenCampaign", async (campaignId: string) => {
  const orgId = await requireOrgId();
  await assertCampaignInOrg(campaignId, orgId);
  await db.campaign.update({
    where: { id: campaignId },
    data: { status: "active" },
  });
  return { revalidate: ["/campaigns", `/campaigns/${campaignId}`] };
});

export const archiveCampaign = action("archiveCampaign", async (campaignId: string) => {
  const orgId = await requireOrgId();
  await assertCampaignInOrg(campaignId, orgId);
  await db.campaign.update({
    where: { id: campaignId },
    data: { archivedAt: new Date() },
  });
  return { revalidate: ["/campaigns"] };
});

export const restoreCampaign = action("restoreCampaign", async (campaignId: string) => {
  const orgId = await requireOrgId();
  await assertCampaignInOrg(campaignId, orgId);
  await db.campaign.update({
    where: { id: campaignId },
    data: { archivedAt: null },
  });
  return { revalidate: ["/campaigns"] };
});
