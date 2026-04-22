"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Icon } from "@/components/ui/icon";

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

interface SupplierCardListProps {
  suppliers: SupplierRow[];
}

export function SupplierCardList({ suppliers }: SupplierCardListProps) {
  return (
    <div style={{ display: "flex", flexDirection: "column" as const, gap: 8 }}>
      {suppliers.map((supplier) => (
        <Link
          key={supplier.id}
          href={`/suppliers/${supplier.slug}`}
          style={{
            textDecoration: "none",
            color: "inherit",
            display: "flex",
            alignItems: "center",
            gap: 14,
            padding: 16,
            borderRadius: 12,
            backgroundColor: "var(--card-bg)",
            boxShadow: "0 1px 2px rgba(15, 23, 42, 0.04)",
            transition: "box-shadow 0.15s",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.boxShadow = "0 4px 12px rgba(15, 23, 42, 0.08)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.boxShadow = "0 1px 2px rgba(15, 23, 42, 0.04)";
          }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>
              {supplier.name}
            </div>
            <div className="flex items-center gap-1.5 mt-2">
              <Badge variant="default">{supplier.serviceCategory}</Badge>
            </div>
            {supplier.contactName && (
              <div className="text-xs italic font-medium mt-2" style={{ color: "var(--text-sub)" }}>
                {supplier.contactName}
              </div>
            )}
          </div>
          <Icon name="chevronR" size={14} color="var(--text-muted-custom)" />
        </Link>
      ))}
    </div>
  );
}
