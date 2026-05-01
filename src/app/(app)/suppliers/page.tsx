import { notFound } from "next/navigation";
import { getSuppliers, getSupplierStats, getServiceCategories } from "@/lib/queries/supplier-queries";
import { getCurrentOrg } from "@/lib/queries/org-queries";
import { SuppliersListClient } from "@/components/suppliers/suppliers-list-client";

export const dynamic = "force-dynamic";

export default async function SuppliersPage() {
  const org = await getCurrentOrg();
  if (!org) notFound();

  const [suppliers, stats, categories] = await Promise.all([
    getSuppliers(org.id),
    getSupplierStats(org.id),
    getServiceCategories(org.id),
  ]);

  const serializedSuppliers = suppliers.map((s) => ({
    id: s.id,
    slug: s.slug,
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
