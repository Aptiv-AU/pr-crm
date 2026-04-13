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

interface SupplierTableProps {
  suppliers: SupplierRow[];
}

const headerStyle = {
  fontSize: 11,
  fontWeight: 500 as const,
  color: "var(--text-muted-custom)",
  textTransform: "uppercase" as const,
  letterSpacing: "0.06em",
  padding: "8px 12px",
  textAlign: "left" as const,
  borderBottom: "1px solid var(--border-custom)",
};

const cellStyle = {
  padding: "10px 12px",
  borderBottom: "1px solid var(--border-custom)",
  verticalAlign: "middle" as const,
};

export function SupplierTable({ suppliers }: SupplierTableProps) {
  return (
    <table style={{ width: "100%", borderCollapse: "collapse" as const }}>
      <thead>
        <tr>
          <th style={headerStyle}>Name</th>
          <th style={headerStyle}>Category</th>
          <th style={headerStyle}>Contact Person</th>
          <th style={headerStyle}>Phone</th>
          <th style={headerStyle}>Campaigns</th>
          <th style={{ ...headerStyle, width: 32 }} />
        </tr>
      </thead>
      <tbody>
        {suppliers.map((supplier) => (
          <tr
            key={supplier.id}
            style={{ cursor: "pointer" }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.backgroundColor = "var(--hover-bg)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.backgroundColor = "";
            }}
          >
            <td style={cellStyle}>
              <Link
                href={`/suppliers/${supplier.id}`}
                style={{
                  textDecoration: "none",
                  color: "inherit",
                  fontSize: 13,
                  fontWeight: 500,
                }}
              >
                <span style={{ color: "var(--text-primary)" }}>{supplier.name}</span>
              </Link>
            </td>
            <td style={cellStyle}>
              <Link href={`/suppliers/${supplier.id}`} style={{ textDecoration: "none", color: "inherit" }}>
                <Badge variant="default">{supplier.serviceCategory}</Badge>
              </Link>
            </td>
            <td style={cellStyle}>
              <Link href={`/suppliers/${supplier.id}`} style={{ textDecoration: "none", color: "inherit" }}>
                <span style={{ fontSize: 12, color: "var(--text-sub)" }}>
                  {supplier.contactName || "\u2014"}
                </span>
              </Link>
            </td>
            <td style={cellStyle}>
              <Link href={`/suppliers/${supplier.id}`} style={{ textDecoration: "none", color: "inherit" }}>
                <span style={{ fontSize: 12, color: "var(--text-sub)" }}>
                  {supplier.phone || "\u2014"}
                </span>
              </Link>
            </td>
            <td style={cellStyle}>
              <Link href={`/suppliers/${supplier.id}`} style={{ textDecoration: "none", color: "inherit" }}>
                <span style={{ fontSize: 12, color: "var(--text-sub)" }}>
                  {supplier.campaignCount}
                </span>
              </Link>
            </td>
            <td style={cellStyle}>
              <Link href={`/suppliers/${supplier.id}`} style={{ textDecoration: "none", color: "inherit" }}>
                <Icon name="chevronR" size={14} color="var(--text-muted-custom)" />
              </Link>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
