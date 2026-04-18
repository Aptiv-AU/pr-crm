"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addSupplierToCampaign, removeSupplierFromCampaign } from "@/actions/budget-actions";
import { Badge, type BadgeVariant } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { titleCase } from "@/lib/format/title-case";

interface CampaignSupplier {
  id: string;
  supplierId: string;
  role: string | null;
  agreedCost: number | null;
  status: string;
  supplier: {
    id: string;
    name: string;
    serviceCategory: string | null;
  };
}

interface AvailableSupplier {
  id: string;
  name: string;
  serviceCategory: string | null;
}

interface CampaignSuppliersTabProps {
  campaignSuppliers: CampaignSupplier[];
  campaignId: string;
  availableSuppliers: AvailableSupplier[];
}

const supplierStatusVariant: Record<string, BadgeVariant> = {
  pending: "draft",
  confirmed: "active",
  cancelled: "cool",
};

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    minimumFractionDigits: 0,
  }).format(value);
}

const inputStyle = {
  width: "100%",
  height: 34,
  padding: "0 10px",
  fontSize: 13,
  borderRadius: 7,
  border: "1px solid var(--border-custom)",
  backgroundColor: "var(--page-bg)",
  color: "var(--text-primary)",
  outline: "none",
} as const;

const labelStyle = {
  fontSize: 12,
  fontWeight: 500 as const,
  color: "var(--text-sub)",
  marginBottom: 6,
  display: "block" as const,
};

export function CampaignSuppliersTab({
  campaignSuppliers,
  campaignId,
  availableSuppliers,
}: CampaignSuppliersTabProps) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [supplierId, setSupplierId] = useState("");
  const [role, setRole] = useState("");
  const [agreedCost, setAgreedCost] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const linkedSupplierIds = new Set(campaignSuppliers.map((cs) => cs.supplierId));
  const filteredAvailable = availableSuppliers.filter((s) => !linkedSupplierIds.has(s.id));

  function handleAdd() {
    setError(null);
    startTransition(async () => {
      const formData = new FormData();
      formData.set("campaignId", campaignId);
      formData.set("supplierId", supplierId);
      formData.set("role", role);
      if (agreedCost) formData.set("agreedCost", agreedCost);

      const result = await addSupplierToCampaign(formData);
      if ("error" in result) {
        setError(result.error);
      } else {
        setSupplierId("");
        setRole("");
        setAgreedCost("");
        setShowForm(false);
        router.refresh();
      }
    });
  }

  function handleRemove(campaignSupplierId: string) {
    startTransition(async () => {
      await removeSupplierFromCampaign(campaignSupplierId);
      router.refresh();
    });
  }

  return (
    <div>
      {/* Add button */}
      <div style={{ marginBottom: 12 }}>
        <Button
          variant="ghost"
          size="sm"
          icon="plus"
          onClick={() => setShowForm(!showForm)}
        >
          Add supplier
        </Button>
      </div>

      {/* Inline form */}
      {showForm && (
        <div
          style={{
            marginBottom: 16,
            padding: 14,
            borderRadius: 8,
            border: "1px solid var(--border-custom)",
            backgroundColor: "var(--page-bg)",
            display: "flex",
            flexDirection: "column",
            gap: 12,
          }}
        >
          <div>
            <label style={labelStyle}>Supplier</label>
            <select
              value={supplierId}
              onChange={(e) => setSupplierId(e.target.value)}
              style={{ ...inputStyle, cursor: "pointer" }}
            >
              <option value="">Select a supplier</option>
              {filteredAvailable.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                  {s.serviceCategory ? ` (${s.serviceCategory})` : ""}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Role</label>
            <input
              type="text"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              placeholder="e.g., Photographer, Venue"
              style={inputStyle}
            />
          </div>
          <div>
            <label style={labelStyle}>Agreed Cost</label>
            <div style={{ position: "relative" }}>
              <span
                style={{
                  position: "absolute",
                  left: 10,
                  top: "50%",
                  transform: "translateY(-50%)",
                  fontSize: 13,
                  color: "var(--text-muted-custom)",
                }}
              >
                $
              </span>
              <input
                type="number"
                value={agreedCost}
                onChange={(e) => setAgreedCost(e.target.value)}
                placeholder="Optional"
                style={{ ...inputStyle, paddingLeft: 22 }}
              />
            </div>
          </div>

          {error && (
            <div
              style={{
                fontSize: 12,
                color: "var(--amber)",
                padding: "8px 10px",
                borderRadius: 7,
                backgroundColor: "var(--amber-bg)",
                border: "1px solid var(--amber-border)",
              }}
            >
              {error}
            </div>
          )}

          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <Button variant="primary" size="sm" onClick={handleAdd} disabled={isPending}>
              {isPending ? "Adding..." : "Add"}
            </Button>
            <button
              onClick={() => {
                setShowForm(false);
                setSupplierId("");
                setRole("");
                setAgreedCost("");
                setError(null);
              }}
              style={{
                fontSize: 12,
                color: "var(--text-muted-custom)",
                backgroundColor: "transparent",
                border: "none",
                cursor: "pointer",
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Linked suppliers list */}
      {campaignSuppliers.length === 0 && !showForm ? (
        <div
          style={{
            textAlign: "center",
            padding: "30px 20px",
            color: "var(--text-muted-custom)",
            fontSize: 13,
          }}
        >
          No suppliers linked yet
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
          {campaignSuppliers.map((cs) => (
            <div
              key={cs.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "8px 0",
                borderBottom: "1px solid var(--border-custom)",
                opacity: isPending ? 0.6 : 1,
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 13,
                    color: "var(--text-primary)",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {cs.supplier.name}
                </div>
                <div style={{ fontSize: 12, color: "var(--text-sub)" }}>
                  {cs.role || "\u2014"}
                </div>
              </div>
              <div style={{ fontSize: 12, color: "var(--text-sub)", flexShrink: 0 }}>
                {cs.agreedCost != null ? formatCurrency(cs.agreedCost) : "\u2014"}
              </div>
              <Badge variant={supplierStatusVariant[cs.status] ?? "default"}>{titleCase(cs.status)}</Badge>
              <button
                onClick={() => handleRemove(cs.id)}
                disabled={isPending}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 24,
                  height: 24,
                  border: "none",
                  backgroundColor: "transparent",
                  color: "var(--text-muted-custom)",
                  cursor: "pointer",
                  borderRadius: 4,
                  flexShrink: 0,
                }}
              >
                <Icon name="close" size={12} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
