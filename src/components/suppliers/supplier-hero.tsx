"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";

interface SupplierHeroProps {
  supplier: {
    id: string;
    name: string;
    serviceCategory: string;
    website: string | null;
    rating: number | null;
  };
  stats: {
    contactCount: number;
    campaignCount: number;
    totalCost: number;
  };
  onEdit: () => void;
}

function formatCurrency(value: number): string {
  if (value === 0) return "\u2014";
  return `$${value.toLocaleString("en-US")}`;
}

function renderStars(rating: number): string {
  const filled = Math.min(Math.max(Math.round(rating), 0), 5);
  return "\u2605".repeat(filled) + "\u2606".repeat(5 - filled);
}

export function SupplierHero({ supplier, stats, onEdit }: SupplierHeroProps) {
  return (
    <Card style={{ padding: 0 }}>
      <div className="p-5 md:p-6">
        {/* Header row */}
        <div className="flex flex-col md:flex-row md:items-start gap-3">
          <div style={{ display: "flex", alignItems: "center", gap: 14, flex: 1, minWidth: 0 }}>
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: 14,
                backgroundColor: "var(--accent-bg)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <Icon name="suppliers" size={28} color="var(--accent-custom)" />
            </div>
            <div style={{ minWidth: 0 }}>
              <div
                style={{
                  fontSize: 28,
                  fontWeight: 800,
                  letterSpacing: "-0.02em",
                  color: "var(--text-primary)",
                  lineHeight: 1.3,
                }}
              >
                {supplier.name}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 2 }}>
                <Badge variant="default">{supplier.serviceCategory}</Badge>
              </div>
              {supplier.website && (
                <a
                  href={supplier.website.startsWith("http") ? supplier.website : `https://${supplier.website}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    fontSize: 12,
                    color: "var(--accent-custom)",
                    textDecoration: "none",
                    display: "block",
                    marginTop: 2,
                  }}
                >
                  {supplier.website}
                </a>
              )}
              {supplier.rating != null && supplier.rating > 0 && (
                <div
                  style={{
                    fontSize: 14,
                    color: "var(--amber)",
                    marginTop: 2,
                    letterSpacing: 1,
                  }}
                >
                  {renderStars(supplier.rating)}
                </div>
              )}
            </div>
          </div>

          {/* Action buttons */}
          <div style={{ display: "flex", gap: 8 }} className="ml-0 md:ml-auto">
            <Button variant="default" size="sm" icon="edit" onClick={onEdit}>
              Edit
            </Button>
            <Button variant="primary" size="sm" icon="plus">
              Add to campaign
            </Button>
          </div>
        </div>

        {/* Stats strip */}
        <div className="grid grid-cols-3 gap-3 mt-5">
          {[
            { label: "People", value: stats.contactCount },
            { label: "Campaigns", value: stats.campaignCount },
            { label: "Total cost", value: formatCurrency(stats.totalCost) },
          ].map((stat) => (
            <div
              key={stat.label}
              style={{
                padding: "10px 12px",
                borderRadius: 8,
                backgroundColor: "var(--page-bg)",
                border: "1px solid var(--border-custom)",
              }}
            >
              <div
                style={{
                  fontSize: 16,
                  fontWeight: 700,
                  color: "var(--text-primary)",
                  lineHeight: 1.2,
                }}
              >
                {stat.value}
              </div>
              <div
                style={{
                  fontSize: 11,
                  color: "var(--text-muted-custom)",
                  marginTop: 2,
                }}
              >
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}
