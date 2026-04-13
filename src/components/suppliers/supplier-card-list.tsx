"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Icon } from "@/components/ui/icon";

interface SupplierRow {
  id: string;
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
          href={`/suppliers/${supplier.id}`}
          style={{
            textDecoration: "none",
            color: "inherit",
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: 12,
            borderRadius: 10,
            backgroundColor: "var(--card-bg)",
            border: "1px solid var(--border-custom)",
            transition: "border-color 0.15s",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.borderColor = "var(--border-mid)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.borderColor = "var(--border-custom)";
          }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>
              {supplier.name}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}>
              <Badge variant="default">{supplier.serviceCategory}</Badge>
            </div>
            {supplier.contactName && (
              <div style={{ fontSize: 11, color: "var(--text-sub)", marginTop: 4 }}>
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
