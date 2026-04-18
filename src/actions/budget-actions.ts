"use server";

import { db } from "@/lib/db";
import { action } from "@/lib/server/action";
import { requireOrgId } from "@/lib/server/org";

async function assertCampaignInOrg(campaignId: string, orgId: string): Promise<void> {
  const found = await db.campaign.findFirst({
    where: { id: campaignId, organizationId: orgId },
    select: { id: true },
  });
  if (!found) throw new Error("Campaign not found");
}

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

    const orgId = await requireOrgId();
    const [campaign, supplier] = await Promise.all([
      db.campaign.findFirst({
        where: { id: campaignId, organizationId: orgId },
        select: { id: true },
      }),
      db.supplier.findFirst({
        where: { id: supplierId, organizationId: orgId },
        select: { id: true, name: true },
      }),
    ]);
    if (!campaign) throw new Error("Campaign not found");
    if (!supplier) throw new Error("Supplier not found");

    const agreedCost = agreedCostStr ? parseFloat(agreedCostStr) : null;

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
          description: `${supplier.name} — ${role}`,
          amount: agreedCost,
          confirmed: false,
          supplierId,
        },
      });
    }

    return {
      revalidate: ["/campaigns", `/campaigns/${campaignId}`],
      revalidateTags: [`campaign:${campaignId}`],
    };
  }
);

export const removeSupplierFromCampaign = action(
  "removeSupplierFromCampaign",
  async (campaignSupplierId: string) => {
    const orgId = await requireOrgId();
    const existing = await db.campaignSupplier.findFirst({
      where: { id: campaignSupplierId, campaign: { organizationId: orgId } },
      select: { campaignId: true, supplierId: true },
    });

    if (!existing) {
      throw new Error("Campaign supplier not found");
    }

    // Delete linked budget line items for this supplier+campaign
    await db.budgetLineItem.deleteMany({
      where: { campaignId: existing.campaignId, supplierId: existing.supplierId },
    });

    await db.campaignSupplier.delete({
      where: { id: campaignSupplierId },
    });

    return {
      revalidate: ["/campaigns", `/campaigns/${existing.campaignId}`],
      revalidateTags: [`campaign:${existing.campaignId}`],
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

    const orgId = await requireOrgId();
    await assertCampaignInOrg(campaignId, orgId);

    const amount = parseFloat(amountStr);
    if (isNaN(amount)) {
      throw new Error("Amount must be a valid number");
    }

    if (supplierId) {
      const supplier = await db.supplier.findFirst({
        where: { id: supplierId, organizationId: orgId },
        select: { id: true },
      });
      if (!supplier) throw new Error("Supplier not found");
    }

    await db.budgetLineItem.create({
      data: {
        campaignId,
        description,
        amount,
        supplierId: supplierId || null,
      },
    });

    return {
      revalidate: ["/campaigns", `/campaigns/${campaignId}`],
      revalidateTags: [`campaign:${campaignId}`],
    };
  }
);

export const deleteBudgetLineItem = action(
  "deleteBudgetLineItem",
  async (lineItemId: string) => {
    const orgId = await requireOrgId();
    const existing = await db.budgetLineItem.findFirst({
      where: { id: lineItemId, campaign: { organizationId: orgId } },
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
      revalidateTags: [`campaign:${existing.campaignId}`],
    };
  }
);

export const confirmBudgetLineItem = action(
  "confirmBudgetLineItem",
  async (lineItemId: string, amount?: number, confirmed?: boolean) => {
    const orgId = await requireOrgId();
    const existing = await db.budgetLineItem.findFirst({
      where: { id: lineItemId, campaign: { organizationId: orgId } },
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
      revalidateTags: [`campaign:${existing.campaignId}`],
    };
  }
);
