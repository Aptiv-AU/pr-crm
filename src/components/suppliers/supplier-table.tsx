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

interface SupplierTableProps {
  suppliers: SupplierRow[];
}

const headerTh: React.CSSProperties = {
  fontSize: 10,
  fontWeight: 900,
  color: "var(--text-muted-custom)",
  textTransform: "uppercase",
  letterSpacing: "0.14em",
  padding: "16px 20px",
  textAlign: "left",
};

const cellTd: React.CSSProperties = {
  padding: "16px 20px",
  verticalAlign: "middle",
};

export function SupplierTable({ suppliers }: SupplierTableProps) {
  return (
    <section
      className="rounded-xl overflow-hidden"
      style={{
        backgroundColor: "var(--card-bg)",
        boxShadow: "0 1px 2px rgba(15, 23, 42, 0.04)",
      }}
    >
      <div className="overflow-x-auto">
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ backgroundColor: "var(--surface-container-high)" }}>
              <th style={{ ...headerTh, paddingLeft: 28 }}>Name</th>
              <th style={headerTh}>Category</th>
              <th style={headerTh}>Contact</th>
              <th style={headerTh}>Phone</th>
              <th style={headerTh}>Campaigns</th>
              <th style={{ ...headerTh, textAlign: "right", paddingRight: 28 }} />
            </tr>
          </thead>
          <tbody>
            {suppliers.map((supplier, idx) => (
              <tr
                key={supplier.id}
                style={{
                  cursor: "pointer",
                  borderTop: idx === 0 ? "none" : "1px solid var(--surface-container)",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.backgroundColor = "var(--surface-container-low)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.backgroundColor = "";
                }}
              >
                <td style={{ ...cellTd, paddingLeft: 28 }}>
                  <Link
                    href={`/suppliers/${supplier.slug}`}
                    style={{ textDecoration: "none", color: "inherit" }}
                  >
                    <span className="font-bold text-sm" style={{ color: "var(--text-primary)" }}>
                      {supplier.name}
                    </span>
                  </Link>
                </td>
                <td style={cellTd}>
                  <Link href={`/suppliers/${supplier.slug}`} style={{ textDecoration: "none", color: "inherit" }}>
                    <Badge variant="default">{supplier.serviceCategory}</Badge>
                  </Link>
                </td>
                <td style={cellTd}>
                  <Link href={`/suppliers/${supplier.slug}`} style={{ textDecoration: "none", color: "inherit" }}>
                    <span className="text-xs italic font-medium" style={{ color: "var(--text-sub)" }}>
                      {supplier.contactName || "\u2014"}
                    </span>
                  </Link>
                </td>
                <td style={cellTd}>
                  <Link href={`/suppliers/${supplier.slug}`} style={{ textDecoration: "none", color: "inherit" }}>
                    <span className="text-xs font-medium" style={{ color: "var(--text-sub)" }}>
                      {supplier.phone || "\u2014"}
                    </span>
                  </Link>
                </td>
                <td style={cellTd}>
                  <Link href={`/suppliers/${supplier.slug}`} style={{ textDecoration: "none", color: "inherit" }}>
                    <span className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>
                      {supplier.campaignCount}
                    </span>
                  </Link>
                </td>
                <td style={{ ...cellTd, textAlign: "right", paddingRight: 28 }}>
                  <Link
                    href={`/suppliers/${supplier.slug}`}
                    style={{ display: "inline-flex", textDecoration: "none", color: "var(--text-muted-custom)" }}
                  >
                    <Icon name="chevronR" size={16} color="var(--text-muted-custom)" />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
