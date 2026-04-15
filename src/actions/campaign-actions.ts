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

const PHASE_TEMPLATES: Record<string, string[]> = {
  press: ["Draft Pitches", "Outreach", "Coverage"],
  event: ["Planning", "Invite List", "Send Invitations", "Track RSVPs", "Logistics & Runsheet", "Post-event Follow-up"],
  gifting: ["Select Products", "Build Send List", "Ship & Track", "Follow-up", "Coverage Tracking"],
};

export async function createCampaign(formData: FormData) {
  try {
    const name = formData.get("name") as string | null;
    const type = formData.get("type") as string | null;
    const clientId = formData.get("clientId") as string | null;
    const budgetStr = formData.get("budget") as string | null;
    const startDateStr = formData.get("startDate") as string | null;
    const dueDateStr = formData.get("dueDate") as string | null;
    const brief = formData.get("brief") as string | null;

    if (!name || !type || !clientId) {
      return { error: "Name, type, and client are required" };
    }

    const organizationId = await getOrganizationId();

    const budget = budgetStr ? parseFloat(budgetStr) : null;
    const startDate = startDateStr ? new Date(startDateStr) : null;
    const dueDate = dueDateStr ? new Date(dueDateStr) : null;

    const phases = PHASE_TEMPLATES[type] || [];
    const firstPhaseName = phases[0] || null;

    const campaign = await db.campaign.create({
      data: {
        organizationId,
        clientId,
        name,
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

    revalidatePath("/campaigns");
    revalidatePath("/workspaces");

    return { success: true, campaignId: campaign.id };
  } catch (error) {
    console.error("createCampaign error:", error);
    return {
      error: error instanceof Error ? error.message : "Failed to create campaign",
    };
  }
}

export async function updateCampaign(campaignId: string, formData: FormData) {
  try {
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

    revalidatePath("/campaigns");
    revalidatePath(`/campaigns/${campaignId}`);
    revalidatePath("/workspaces");

    return { success: true };
  } catch (error) {
    console.error("updateCampaign error:", error);
    return {
      error: error instanceof Error ? error.message : "Failed to update campaign",
    };
  }
}

export async function updatePhaseStatus(phaseId: string, status: string) {
  try {
    const phase = await db.campaignPhase.findUnique({
      where: { id: phaseId },
      include: { campaign: true },
    });

    if (!phase) {
      return { error: "Phase not found" };
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

    revalidatePath("/campaigns");
    revalidatePath(`/campaigns/${phase.campaignId}`);

    return { success: true };
  } catch (error) {
    console.error("updatePhaseStatus error:", error);
    return {
      error: error instanceof Error ? error.message : "Failed to update phase status",
    };
  }
}

export async function addContactToCampaign(campaignId: string, contactId: string) {
  try {
    await db.campaignContact.create({
      data: {
        campaignId,
        contactId,
        status: "added",
      },
    });

    revalidatePath("/campaigns");
    revalidatePath(`/campaigns/${campaignId}`);

    return { success: true };
  } catch (error) {
    console.error("addContactToCampaign error:", error);
    return {
      error: error instanceof Error ? error.message : "Failed to add contact to campaign",
    };
  }
}

export async function removeContactFromCampaign(campaignContactId: string) {
  try {
    const existing = await db.campaignContact.findUnique({
      where: { id: campaignContactId },
      select: { campaignId: true },
    });

    if (!existing) {
      return { error: "Campaign contact not found" };
    }

    await db.campaignContact.delete({
      where: { id: campaignContactId },
    });

    revalidatePath("/campaigns");
    revalidatePath(`/campaigns/${existing.campaignId}`);

    return { success: true };
  } catch (error) {
    console.error("removeContactFromCampaign error:", error);
    return {
      error: error instanceof Error ? error.message : "Failed to remove contact from campaign",
    };
  }
}

export async function addSupplierToCampaign(formData: FormData) {
  try {
    const campaignId = formData.get("campaignId") as string | null;
    const supplierId = formData.get("supplierId") as string | null;
    const role = formData.get("role") as string | null;
    const agreedCostStr = formData.get("agreedCost") as string | null;

    if (!campaignId || !supplierId || !role) {
      return { error: "Campaign, supplier, and role are required" };
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

    revalidatePath("/campaigns");
    revalidatePath(`/campaigns/${campaignId}`);

    return { success: true };
  } catch (error) {
    console.error("addSupplierToCampaign error:", error);
    return {
      error: error instanceof Error ? error.message : "Failed to add supplier to campaign",
    };
  }
}

export async function removeSupplierFromCampaign(campaignSupplierId: string) {
  try {
    const existing = await db.campaignSupplier.findUnique({
      where: { id: campaignSupplierId },
      select: { campaignId: true },
    });

    if (!existing) {
      return { error: "Campaign supplier not found" };
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

    revalidatePath("/campaigns");
    revalidatePath(`/campaigns/${existing.campaignId}`);

    return { success: true };
  } catch (error) {
    console.error("removeSupplierFromCampaign error:", error);
    return {
      error: error instanceof Error ? error.message : "Failed to remove supplier from campaign",
    };
  }
}

export async function addBudgetLineItem(formData: FormData) {
  try {
    const campaignId = formData.get("campaignId") as string | null;
    const description = formData.get("description") as string | null;
    const amountStr = formData.get("amount") as string | null;
    const supplierId = formData.get("supplierId") as string | null;

    if (!campaignId || !description || !amountStr) {
      return { error: "Campaign, description, and amount are required" };
    }

    const amount = parseFloat(amountStr);
    if (isNaN(amount)) {
      return { error: "Amount must be a valid number" };
    }

    await db.budgetLineItem.create({
      data: {
        campaignId,
        description,
        amount,
        supplierId: supplierId || null,
      },
    });

    revalidatePath("/campaigns");
    revalidatePath(`/campaigns/${campaignId}`);

    return { success: true };
  } catch (error) {
    console.error("addBudgetLineItem error:", error);
    return {
      error: error instanceof Error ? error.message : "Failed to add budget line item",
    };
  }
}

export async function deleteBudgetLineItem(lineItemId: string) {
  try {
    const existing = await db.budgetLineItem.findUnique({
      where: { id: lineItemId },
      select: { campaignId: true },
    });

    if (!existing) {
      return { error: "Budget line item not found" };
    }

    await db.budgetLineItem.delete({
      where: { id: lineItemId },
    });

    revalidatePath("/campaigns");
    revalidatePath(`/campaigns/${existing.campaignId}`);

    return { success: true };
  } catch (error) {
    console.error("deleteBudgetLineItem error:", error);
    return {
      error: error instanceof Error ? error.message : "Failed to delete budget line item",
    };
  }
}

export async function confirmBudgetLineItem(lineItemId: string, amount?: number, confirmed?: boolean) {
  try {
    const existing = await db.budgetLineItem.findUnique({
      where: { id: lineItemId },
      select: { campaignId: true },
    });
    if (!existing) return { error: "Budget line item not found" };

    await db.budgetLineItem.update({
      where: { id: lineItemId },
      data: {
        confirmed: confirmed ?? true,
        ...(amount !== undefined ? { amount } : {}),
      },
    });

    revalidatePath("/campaigns");
    revalidatePath(`/campaigns/${existing.campaignId}`);
    return { success: true };
  } catch (error) {
    console.error("confirmBudgetLineItem error:", error);
    return { error: error instanceof Error ? error.message : "Failed to confirm" };
  }
}

export async function revertToPhase(phaseId: string) {
  try {
    const phase = await db.campaignPhase.findUnique({
      where: { id: phaseId },
    });
    if (!phase) return { error: "Phase not found" };

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

    revalidatePath("/campaigns");
    revalidatePath(`/campaigns/${phase.campaignId}`);
    return { success: true };
  } catch (error) {
    console.error("revertToPhase error:", error);
    return { error: error instanceof Error ? error.message : "Failed to revert phase" };
  }
}

export async function completeCampaign(campaignId: string) {
  try {
    await db.campaign.update({
      where: { id: campaignId },
      data: { status: "complete" },
    });
    revalidatePath("/campaigns");
    revalidatePath(`/campaigns/${campaignId}`);
    return { success: true };
  } catch (error) {
    console.error("completeCampaign error:", error);
    return { error: error instanceof Error ? error.message : "Failed to complete campaign" };
  }
}

export async function reopenCampaign(campaignId: string) {
  try {
    await db.campaign.update({
      where: { id: campaignId },
      data: { status: "active" },
    });
    revalidatePath("/campaigns");
    revalidatePath(`/campaigns/${campaignId}`);
    return { success: true };
  } catch (error) {
    console.error("reopenCampaign error:", error);
    return { error: error instanceof Error ? error.message : "Failed to reopen campaign" };
  }
}

export async function archiveCampaign(campaignId: string) {
  try {
    await db.campaign.update({
      where: { id: campaignId },
      data: { archivedAt: new Date() },
    });
    revalidatePath("/campaigns");
    return { success: true };
  } catch (error) {
    console.error("archiveCampaign error:", error);
    return { error: error instanceof Error ? error.message : "Failed to archive campaign" };
  }
}

export async function restoreCampaign(campaignId: string) {
  try {
    await db.campaign.update({
      where: { id: campaignId },
      data: { archivedAt: null },
    });
    revalidatePath("/campaigns");
    return { success: true };
  } catch (error) {
    console.error("restoreCampaign error:", error);
    return { error: error instanceof Error ? error.message : "Failed to restore campaign" };
  }
}
