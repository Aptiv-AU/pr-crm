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

const PHASE_TEMPLATES: Record<string, string[]> = {
  press: ["Draft Pitches", "Outreach", "Coverage"],
  event: ["Planning", "Invite List", "Send Invitations", "Track RSVPs", "Logistics & Runsheet", "Post-event Follow-up"],
  gifting: ["Select Products", "Build Send List", "Ship & Track", "Follow-up", "Coverage Tracking"],
};

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

  const organizationId = await getOrganizationId();

  const budget = budgetStr ? parseFloat(budgetStr) : null;
  const startDate = startDateStr ? new Date(startDateStr) : null;
  const dueDate = dueDateStr ? new Date(dueDateStr) : null;

  const phases = PHASE_TEMPLATES[type] || [];
  const firstPhaseName = phases[0] || null;

  const slug = await ensureUniqueSlug(slugify(name), async (candidate) => {
    const existing = await db.campaign.findFirst({
      where: { organizationId, slug: candidate },
      select: { id: true },
    });
    return existing !== null;
  });

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

export const updatePhaseStatus = action(
  "updatePhaseStatus",
  async (phaseId: string, status: string) => {
    const phase = await db.campaignPhase.findUnique({
      where: { id: phaseId },
      include: { campaign: true },
    });

    if (!phase) {
      throw new Error("Phase not found");
    }

    await db.campaignPhase.update({
      where: { id: phaseId },
      data: { status },
    });

    if (status === "complete") {
      const nextPhase = await db.campaignPhase.findFirst({
        where: {
          campaignId: phase.campaignId,
          order: { gt: phase.order },
        },
        orderBy: { order: "asc" },
      });

      if (nextPhase) {
        await db.campaignPhase.update({
          where: { id: nextPhase.id },
          data: { status: "active" },
        });

        await db.campaign.update({
          where: { id: phase.campaignId },
          data: { currentPhase: nextPhase.name },
        });
      } else {
        await db.campaign.update({
          where: { id: phase.campaignId },
          data: { status: "complete" },
        });
      }
    }

    return { revalidate: ["/campaigns", `/campaigns/${phase.campaignId}`] };
  }
);

export const addContactToCampaign = action(
  "addContactToCampaign",
  async (campaignId: string, contactId: string) => {
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
    const existing = await db.campaignContact.findUnique({
      where: { id: campaignContactId },
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

export const addSupplierToCampaign = action(
  "addSupplierToCampaign",
  async (formData: FormData) => {
    const campaignId = formData.get("campaignId") as string | null;
    const supplierId = formData.get("supplierId") as string | null;
    const role = formData.get("role") as string | null;
    const agreedCostStr = formData.get("agreedCost") as string | null;

    if (!campaignId || !supplierId || !role) {
      throw new Error("Campaign, supplier, and role are required");
    }

    const agreedCost = agreedCostStr ? parseFloat(agreedCostStr) : null;

    // Fetch supplier name for budget description
    const supplier = await db.supplier.findUnique({
      where: { id: supplierId },
      select: { name: true },
    });

    await db.campaignSupplier.create({
      data: {
        campaignId,
        supplierId,
        role,
        agreedCost: agreedCost !== null && !isNaN(agreedCost) ? agreedCost : null,
      },
    });

    // Auto-create a budget line item linked to this supplier
    if (agreedCost !== null && !isNaN(agreedCost) && agreedCost > 0) {
      await db.budgetLineItem.create({
        data: {
          campaignId,
          description: `${supplier?.name ?? "Supplier"} — ${role}`,
          amount: agreedCost,
          confirmed: false,
          supplierId,
        },
      });
    }

    return { revalidate: ["/campaigns", `/campaigns/${campaignId}`] };
  }
);

export const removeSupplierFromCampaign = action(
  "removeSupplierFromCampaign",
  async (campaignSupplierId: string) => {
    const existing = await db.campaignSupplier.findUnique({
      where: { id: campaignSupplierId },
      select: { campaignId: true },
    });

    if (!existing) {
      throw new Error("Campaign supplier not found");
    }

    // Delete linked budget line items for this supplier+campaign
    const cs = await db.campaignSupplier.findUnique({
      where: { id: campaignSupplierId },
      select: { supplierId: true },
    });
    if (cs) {
      await db.budgetLineItem.deleteMany({
        where: { campaignId: existing.campaignId, supplierId: cs.supplierId },
      });
    }

    await db.campaignSupplier.delete({
      where: { id: campaignSupplierId },
    });

    return {
      revalidate: ["/campaigns", `/campaigns/${existing.campaignId}`],
    };
  }
);

export const addBudgetLineItem = action(
  "addBudgetLineItem",
  async (formData: FormData) => {
    const campaignId = formData.get("campaignId") as string | null;
    const description = formData.get("description") as string | null;
    const amountStr = formData.get("amount") as string | null;
    const supplierId = formData.get("supplierId") as string | null;

    if (!campaignId || !description || !amountStr) {
      throw new Error("Campaign, description, and amount are required");
    }

    const amount = parseFloat(amountStr);
    if (isNaN(amount)) {
      throw new Error("Amount must be a valid number");
    }

    await db.budgetLineItem.create({
      data: {
        campaignId,
        description,
        amount,
        supplierId: supplierId || null,
      },
    });

    return { revalidate: ["/campaigns", `/campaigns/${campaignId}`] };
  }
);

export const deleteBudgetLineItem = action(
  "deleteBudgetLineItem",
  async (lineItemId: string) => {
    const existing = await db.budgetLineItem.findUnique({
      where: { id: lineItemId },
      select: { campaignId: true },
    });

    if (!existing) {
      throw new Error("Budget line item not found");
    }

    await db.budgetLineItem.delete({
      where: { id: lineItemId },
    });

    return {
      revalidate: ["/campaigns", `/campaigns/${existing.campaignId}`],
    };
  }
);

export const confirmBudgetLineItem = action(
  "confirmBudgetLineItem",
  async (lineItemId: string, amount?: number, confirmed?: boolean) => {
    const existing = await db.budgetLineItem.findUnique({
      where: { id: lineItemId },
      select: { campaignId: true },
    });
    if (!existing) throw new Error("Budget line item not found");

    await db.budgetLineItem.update({
      where: { id: lineItemId },
      data: {
        confirmed: confirmed ?? true,
        ...(amount !== undefined ? { amount } : {}),
      },
    });

    return {
      revalidate: ["/campaigns", `/campaigns/${existing.campaignId}`],
    };
  }
);

export const revertToPhase = action("revertToPhase", async (phaseId: string) => {
  const phase = await db.campaignPhase.findUnique({
    where: { id: phaseId },
  });
  if (!phase) throw new Error("Phase not found");

  // Set this phase to active, all phases with higher order to pending
  await db.$transaction([
    db.campaignPhase.update({
      where: { id: phaseId },
      data: { status: "active" },
    }),
    db.campaignPhase.updateMany({
      where: {
        campaignId: phase.campaignId,
        order: { gt: phase.order },
      },
      data: { status: "pending" },
    }),
    db.campaign.update({
      where: { id: phase.campaignId },
      data: { currentPhase: phase.name, status: "active" },
    }),
  ]);

  return { revalidate: ["/campaigns", `/campaigns/${phase.campaignId}`] };
});

export const completeCampaign = action("completeCampaign", async (campaignId: string) => {
  await db.campaign.update({
    where: { id: campaignId },
    data: { status: "complete" },
  });
  return { revalidate: ["/campaigns", `/campaigns/${campaignId}`] };
});

export const reopenCampaign = action("reopenCampaign", async (campaignId: string) => {
  await db.campaign.update({
    where: { id: campaignId },
    data: { status: "active" },
  });
  return { revalidate: ["/campaigns", `/campaigns/${campaignId}`] };
});

export const archiveCampaign = action("archiveCampaign", async (campaignId: string) => {
  await db.campaign.update({
    where: { id: campaignId },
    data: { archivedAt: new Date() },
  });
  return { revalidate: ["/campaigns"] };
});

export const restoreCampaign = action("restoreCampaign", async (campaignId: string) => {
  await db.campaign.update({
    where: { id: campaignId },
    data: { archivedAt: null },
  });
  return { revalidate: ["/campaigns"] };
});
