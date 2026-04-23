"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { EmptyState } from "@/components/shared/empty-state";
import { SlideOverPanel } from "@/components/shared/slide-over-panel";
import { SupplierForm } from "@/components/suppliers/supplier-form";
import { PageContainer, PageHeader } from "@/components/layout/page-header";

const TEAL = "#006C49";

interface SupplierRow {
  id: string;
  slug: string;
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

  const categoryOptions = useMemo(() => {
    const counts = new Map<string, number>();
    for (const s of suppliers) {
      counts.set(s.serviceCategory, (counts.get(s.serviceCategory) ?? 0) + 1);
    }
    const base = categories.filter((c) => c !== "All");
    return [
      { key: "All", label: "All", count: suppliers.length },
      ...base.map((c) => ({ key: c, label: c, count: counts.get(c) ?? 0 })),
    ];
  }, [categories, suppliers]);

  const filtered = useMemo(() => {
    if (selectedCategory === "All") return suppliers;
    return suppliers.filter((s) => s.serviceCategory === selectedCategory);
  }, [suppliers, selectedCategory]);

  function handleSuccess() {
    setAddOpen(false);
    router.refresh();
  }

  return (
    <PageContainer>
      <PageHeader
        eyebrow="Directory"
        title="Suppliers"
        subtitle="Your little black book of printers, photographers and fixers."
        meta={[
          { label: "Total", value: String(stats.total) },
          { label: "Categories", value: String(stats.categoryCount) },
          { label: "On campaigns", value: String(stats.withCampaigns) },
        ]}
        actions={
          <>
            <Button variant="outline" size="sm" icon="filter">
              Category
            </Button>
            <Button variant="primary" size="sm" icon="plus" onClick={() => setAddOpen(true)}>
              New supplier
            </Button>
          </>
        }
      />

      <div className="flex flex-wrap gap-2">
        {categoryOptions.map((opt) => {
          const on = selectedCategory === opt.key;
          return (
            <button
              key={opt.key}
              type="button"
              onClick={() => setSelectedCategory(opt.key)}
              className="inline-flex items-center gap-2 rounded-full border-0 cursor-pointer uppercase"
              style={{
                height: 32,
                padding: "0 14px",
                background: on ? TEAL : "var(--surface-container-low)",
                color: on ? "#fff" : "var(--text-sub)",
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: "0.08em",
                fontFamily: "var(--font-sans)",
              }}
            >
              <span>{opt.label}</span>
              <span
                style={{
                  fontSize: 10,
                  fontFamily: "var(--font-mono)",
                  fontWeight: 600,
                  color: on ? "#fff" : "var(--text-muted-custom)",
                  opacity: on ? 0.9 : 1,
                }}
              >
                {opt.count}
              </span>
            </button>
          );
        })}
      </div>

      {filtered.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filtered.map((s) => (
            <Link
              key={s.id}
              href={`/suppliers/${s.slug}`}
              className="block no-underline"
              style={{ color: "inherit" }}
            >
              <Card
                className="transition-shadow hover:shadow-md"
                style={{
                  padding: 18,
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                }}
              >
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 6,
                    background: "var(--surface-container-low)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <Icon name="suppliers" size={18} color="var(--text-sub)" />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      style={{
                        fontSize: 14,
                        fontWeight: 800,
                        letterSpacing: "-0.005em",
                      }}
                    >
                      {s.name}
                    </span>
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      color: "var(--text-sub)",
                      marginTop: 3,
                      fontWeight: 500,
                    }}
                  >
                    <span style={{ fontStyle: "italic" }}>{s.serviceCategory}</span>
                    {s.contactName && (
                      <span style={{ color: "var(--text-muted-custom)" }}>
                        {" "}— {s.contactName}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2.5 mt-2">
                    <span
                      style={{
                        fontSize: 11,
                        color: "var(--text-muted-custom)",
                        fontFamily: "var(--font-mono)",
                        fontWeight: 600,
                      }}
                    >
                      {s.campaignCount} {s.campaignCount === 1 ? "campaign" : "campaigns"}
                    </span>
                    {s.email && (
                      <span
                        className="truncate"
                        style={{
                          fontSize: 11,
                          color: "var(--text-muted-custom)",
                          fontWeight: 500,
                        }}
                      >
                        · {s.email}
                      </span>
                    )}
                  </div>
                </div>
                <Icon name="chevronR" size={14} color="var(--text-muted-custom)" />
              </Card>
            </Link>
          ))}
        </div>
      ) : suppliers.length > 0 ? (
        <EmptyState
          icon="suppliers"
          title="No suppliers match this filter"
          description="Try selecting a different category."
        />
      ) : (
        <EmptyState
          icon="suppliers"
          title="No suppliers yet"
          description="Add your first supplier to get started."
        />
      )}

      <SlideOverPanel open={addOpen} onClose={() => setAddOpen(false)} title="Add Supplier">
        {addOpen && <SupplierForm onSuccess={handleSuccess} />}
      </SlideOverPanel>
    </PageContainer>
  );
}
