import { db } from "@/lib/db";

export async function getSuppliers(organizationId: string, serviceCategory?: string) {
  const suppliers = await db.supplier.findMany({
    where: {
      organizationId,
      ...(serviceCategory && serviceCategory !== "All" ? { serviceCategory } : {}),
    },
    include: {
      _count: {
        select: { campaignSuppliers: true },
      },
      contacts: {
        select: { name: true },
        take: 1,
      },
    },
    orderBy: { name: "asc" },
  });

  return suppliers;
}

export async function getSupplierById(supplierId: string) {
  const supplier = await db.supplier.findUnique({
    where: { id: supplierId },
    include: {
      contacts: true,
      campaignSuppliers: {
        include: {
          campaign: {
            select: {
              id: true,
              name: true,
              type: true,
              status: true,
              client: {
                select: {
                  id: true,
                  name: true,
                  initials: true,
                  colour: true,
                  bgColour: true,
                },
              },
            },
          },
        },
      },
      budgetLineItems: {
        include: {
          campaign: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
    },
  });

  return supplier;
}

export async function getSupplierStats(organizationId: string) {
  const [total, categories, withCampaigns] = await Promise.all([
    db.supplier.count({ where: { organizationId } }),
    db.supplier.findMany({
      where: { organizationId },
      select: { serviceCategory: true },
      distinct: ["serviceCategory"],
    }),
    db.supplier.count({
      where: {
        organizationId,
        campaignSuppliers: { some: {} },
      },
    }),
  ]);

  return { total, categoryCount: categories.length, withCampaigns };
}

export async function getServiceCategories(organizationId: string) {
  const suppliers = await db.supplier.findMany({
    where: { organizationId },
    select: { serviceCategory: true },
    distinct: ["serviceCategory"],
    orderBy: { serviceCategory: "asc" },
  });

  return suppliers.map((s) => s.serviceCategory);
}
