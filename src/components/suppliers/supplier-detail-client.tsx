"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { SupplierHero } from "@/components/suppliers/supplier-hero";
import { SupplierTabs } from "@/components/suppliers/supplier-tabs";
import { SupplierInfoSidebar } from "@/components/suppliers/supplier-info-sidebar";
import { SlideOverPanel } from "@/components/shared/slide-over-panel";
import { SupplierForm } from "@/components/suppliers/supplier-form";

interface SupplierContact {
  id: string;
  name: string;
  role: string | null;
  email: string | null;
  phone: string | null;
}

interface CampaignSupplier {
  id: string;
  role: string | null;
  status: string;
  agreedCost: number | string | null;
  campaign: {
    id: string;
    name: string;
    type: string;
    status: string;
    client: {
      id: string;
      name: string;
      initials: string;
      colour: string;
      bgColour: string;
    };
  };
}

interface BudgetLineItem {
  id: string;
  description: string;
  amount: number | string;
  campaign: {
    id: string;
    name: string;
  };
}

interface SupplierDetailClientProps {
  supplier: {
    id: string;
    name: string;
    serviceCategory: string;
    email: string | null;
    phone: string | null;
    website: string | null;
    notes: string | null;
    rating: number | null;
    contacts: SupplierContact[];
    campaignSuppliers: CampaignSupplier[];
    budgetLineItems: BudgetLineItem[];
  };
  stats: {
    contactCount: number;
    campaignCount: number;
    totalCost: number;
  };
}

export function SupplierDetailClient({ supplier, stats }: SupplierDetailClientProps) {
  const [editOpen, setEditOpen] = useState(false);
  const router = useRouter();

  function handleEditSuccess() {
    setEditOpen(false);
    router.refresh();
  }

  return (
    <>
      <div className="flex flex-col gap-4 md:flex-row">
        {/* Left column */}
        <div className="flex-1 flex flex-col gap-4">
          <SupplierHero
            supplier={supplier}
            stats={stats}
            onEdit={() => setEditOpen(true)}
          />
          <SupplierTabs
            supplierId={supplier.id}
            supplierContacts={supplier.contacts}
            campaignSuppliers={supplier.campaignSuppliers}
            budgetLineItems={supplier.budgetLineItems}
          />
        </div>

        {/* Right column */}
        <div className="w-full md:w-[300px]">
          <SupplierInfoSidebar supplier={supplier} />
        </div>
      </div>

      <SlideOverPanel
        open={editOpen}
        onClose={() => setEditOpen(false)}
        title="Edit Supplier"
      >
        {editOpen && <SupplierForm supplier={supplier} onSuccess={handleEditSuccess} />}
      </SlideOverPanel>
    </>
  );
}
