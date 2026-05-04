import { notFound } from "next/navigation";
import { getSupplierById } from "@/lib/queries/supplier-queries";
import { SupplierDetailClient } from "@/components/suppliers/supplier-detail-client";
import { db } from "@/lib/db";
import { getCurrentOrg } from "@/lib/queries/org-queries";
import { isCuid } from "@/lib/slug/resolve";

export const dynamic = "force-dynamic";

export default async function SupplierDetailPage({
  params,
}: {
  params: Promise<{ supplierId: string }>;
}) {
  const { supplierId: handle } = await params;

  const org = await getCurrentOrg();
  if (!org) notFound();

  let supplierId: string | null = null;
  if (isCuid(handle)) {
    const owned = await db.supplier.findFirst({
      where: { id: handle, organizationId: org.id },
      select: { id: true },
    });
    supplierId = owned?.id ?? null;
  } else {
    const found = await db.supplier.findFirst({
      where: { organizationId: org.id, slug: handle },
      select: { id: true },
    });
    supplierId = found?.id ?? null;
  }
  if (!supplierId) notFound();

  const supplier = await getSupplierById(supplierId);

  if (!supplier) {
    notFound();
  }

  const contactCount = supplier.contacts.length;
  const campaignCount = supplier.campaignSuppliers.length;
  const totalCost = supplier.budgetLineItems.reduce((sum, item) => {
    const num = Number(item.amount);
    return sum + (isNaN(num) ? 0 : num);
  }, 0);

  const serializedSupplier = JSON.parse(JSON.stringify(supplier));

  return (
    <div className="px-6 py-8 md:px-10 md:py-10 max-w-[1600px] mx-auto">
      <SupplierDetailClient
        supplier={serializedSupplier}
        stats={{ contactCount, campaignCount, totalCost }}
      />
    </div>
  );
}
