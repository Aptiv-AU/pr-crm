"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { StatsBar } from "@/components/shared/stats-bar";
import { FilterPills } from "@/components/shared/filter-pills";
import { SupplierTable } from "@/components/suppliers/supplier-table";
import { SupplierCardList } from "@/components/suppliers/supplier-card-list";
import { SlideOverPanel } from "@/components/shared/slide-over-panel";
import { EmptyState } from "@/components/shared/empty-state";
import { SupplierForm } from "@/components/suppliers/supplier-form";

interface SupplierRow {
  id: string;
  name: string;
  serviceCategory: string;
  email: string | null;
  phone: string | null;
  contactName: string | null;
  campaignCount: number;
}

interface SuppliersListClientProps {
  suppliers: SupplierRow[];
  stats: { total: number; categoryCount: number; withCampaigns: number };
  categories: string[];
}

export function SuppliersListClient({ suppliers, stats, categories }: SuppliersListClientProps) {
  const router = useRouter();
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [addOpen, setAddOpen] = useState(false);

  const filtered = useMemo(() => {
    if (selectedCategory === "All") return suppliers;
    return suppliers.filter((s) => s.serviceCategory === selectedCategory);
  }, [suppliers, selectedCategory]);

  function handleSuccess() {
    setAddOpen(false);
    router.refresh();
  }

  return (
    <div className="p-4 md:p-6">
      {/* Header row */}
      <div className="flex items-center justify-end" style={{ marginBottom: 16 }}>
        <Button variant="primary" size="sm" icon="plus" onClick={() => setAddOpen(true)}>
          Add supplier
        </Button>
      </div>

      {/* Stats */}
      <div style={{ marginBottom: 16 }}>
        <StatsBar
          stats={[
            { value: stats.total, label: "Total suppliers" },
            { value: stats.categoryCount, label: "Categories" },
            { value: stats.withCampaigns, label: "Linked to campaigns" },
          ]}
        />
      </div>

      {/* Filter pills */}
      <div style={{ marginBottom: 12 }}>
        <FilterPills options={categories} selected={selectedCategory} onChange={setSelectedCategory} />
      </div>

      {/* Table — desktop */}
      <div className="hidden md:block">
        {filtered.length > 0 ? (
          <SupplierTable suppliers={filtered} />
        ) : suppliers.length > 0 ? (
          <EmptyState icon="suppliers" title="No suppliers match this filter" description="Try selecting a different category." />
        ) : (
          <EmptyState icon="suppliers" title="No suppliers yet" description="Add your first supplier to get started." />
        )}
      </div>

      {/* Card list — mobile */}
      <div className="md:hidden">
        {filtered.length > 0 ? (
          <SupplierCardList suppliers={filtered} />
        ) : suppliers.length > 0 ? (
          <EmptyState icon="suppliers" title="No suppliers match this filter" description="Try selecting a different category." />
        ) : (
          <EmptyState icon="suppliers" title="No suppliers yet" description="Add your first supplier to get started." />
        )}
      </div>

      {/* Add supplier slide-over */}
      <SlideOverPanel open={addOpen} onClose={() => setAddOpen(false)} title="Add Supplier">
        {addOpen && <SupplierForm onSuccess={handleSuccess} />}
      </SlideOverPanel>
    </div>
  );
}
