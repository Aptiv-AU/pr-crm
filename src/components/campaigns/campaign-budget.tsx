"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addBudgetLineItem, deleteBudgetLineItem } from "@/actions/campaign-actions";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";

interface LineItem {
  id: string;
  description: string;
  amount: number;
  supplier: { id: string; name: string } | null;
}

interface CampaignBudgetProps {
  lineItems: LineItem[];
  campaignId: string;
  totalBudget: number | null;
}

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

export function CampaignBudget({ lineItems, campaignId, totalBudget }: CampaignBudgetProps) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const spent = lineItems.reduce((sum, item) => sum + item.amount, 0);

  function handleAdd() {
    setError(null);
    startTransition(async () => {
      const formData = new FormData();
      formData.set("campaignId", campaignId);
      formData.set("description", description);
      formData.set("amount", amount);

      const result = await addBudgetLineItem(formData);
      if (result.error) {
        setError(result.error);
      } else {
        setDescription("");
        setAmount("");
        setShowForm(false);
        router.refresh();
      }
    });
  }

  function handleDelete(lineItemId: string) {
    startTransition(async () => {
      await deleteBudgetLineItem(lineItemId);
      router.refresh();
    });
  }

  return (
    <div>
      {/* Summary */}
      <div style={{ fontSize: 13, color: "var(--text-primary)", marginBottom: 16 }}>
        <span style={{ fontWeight: 600 }}>Total: {formatCurrency(spent)}</span>
        {totalBudget ? (
          <span style={{ color: "var(--text-sub)" }}> of {formatCurrency(totalBudget)} budget</span>
        ) : null}
      </div>

      {/* Line items */}
      <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
        {lineItems.length === 0 && !showForm && (
          <div
            style={{
              textAlign: "center",
              padding: "30px 20px",
              color: "var(--text-muted-custom)",
              fontSize: 13,
            }}
          >
            No line items yet
          </div>
        )}

        {lineItems.map((item) => (
          <div
            key={item.id}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "8px 0",
              borderBottom: "1px solid var(--border-custom)",
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
                {item.description}
              </div>
              <div style={{ fontSize: 12, color: "var(--text-sub)" }}>
                {item.supplier?.name || "\u2014"}
              </div>
            </div>
            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", flexShrink: 0 }}>
              {formatCurrency(item.amount)}
            </div>
            <button
              onClick={() => handleDelete(item.id)}
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

      {/* Inline form */}
      {showForm && (
        <div
          style={{
            marginTop: 12,
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
            <label style={labelStyle}>Description</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g., Photography"
              style={inputStyle}
            />
          </div>
          <div>
            <label style={labelStyle}>Amount</label>
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
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0"
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
                setDescription("");
                setAmount("");
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

      {/* Add button */}
      {!showForm && (
        <div style={{ marginTop: 12 }}>
          <Button variant="ghost" size="sm" icon="plus" onClick={() => setShowForm(true)}>
            Add line item
          </Button>
        </div>
      )}
    </div>
  );
}
