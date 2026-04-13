import { db } from "@/lib/db";
import { getSuppliers, getSupplierStats, getServiceCategories } from "@/lib/queries/supplier-queries";
import { SuppliersListClient } from "@/components/suppliers/suppliers-list-client";

export const dynamic = "force-dynamic";

export default async function SuppliersPage() {
  let org = await db.organization.findFirst();
  if (!org) {
    org = await db.organization.create({ data: { name: "NWPR", currency: "AUD" } });
  }

  const [suppliers, stats, categories] = await Promise.all([
    getSuppliers(org.id),
    getSupplierStats(org.id),
    getServiceCategories(org.id),
  ]);

  const serializedSuppliers = suppliers.map((s) => ({
    id: s.id,
    name: s.name,
    serviceCategory: s.serviceCategory,
    email: s.email,
    phone: s.phone,
    contactName: s.contacts[0]?.name ?? null,
    campaignCount: s._count.campaignSuppliers,
  }));

  return (
    <SuppliersListClient
      suppliers={serializedSuppliers}
      stats={stats}
      categories={["All", ...categories]}
    />
  );
}
