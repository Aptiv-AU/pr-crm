"use client";

import { useState, useTransition } from "react";
import { createSupplier, updateSupplier } from "@/actions/supplier-actions";
import { Button } from "@/components/ui/button";

interface SupplierFormProps {
  supplier?: {
    id: string;
    name: string;
    serviceCategory: string;
    email: string | null;
    phone: string | null;
    website: string | null;
    notes: string | null;
    rating: number | null;
  } | null;
  onSuccess: () => void;
}

function StarRating({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div style={{ display: "flex", gap: 4 }}>
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => onChange(star)}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: 2,
            fontSize: 20,
            color: star <= value ? "var(--amber)" : "var(--border-mid)",
            lineHeight: 1,
          }}
        >
          ★
        </button>
      ))}
    </div>
  );
}

export function SupplierForm({ supplier, onSuccess }: SupplierFormProps) {
  const isEdit = !!supplier;
  const [name, setName] = useState(supplier?.name ?? "");
  const [serviceCategory, setServiceCategory] = useState(supplier?.serviceCategory ?? "");
  const [email, setEmail] = useState(supplier?.email ?? "");
  const [phone, setPhone] = useState(supplier?.phone ?? "");
  const [website, setWebsite] = useState(supplier?.website ?? "");
  const [notes, setNotes] = useState(supplier?.notes ?? "");
  const [rating, setRating] = useState(supplier?.rating ?? 0);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit() {
    setError(null);
    startTransition(async () => {
      const formData = new FormData();
      formData.set("name", name);
      formData.set("serviceCategory", serviceCategory);
      formData.set("email", email);
      formData.set("phone", phone);
      formData.set("website", website);
      formData.set("notes", notes);
      if (isEdit && rating > 0) {
        formData.set("rating", String(rating));
      }

      const result = isEdit
        ? await updateSupplier(supplier!.id, formData)
        : await createSupplier(formData);

      if ("error" in result) {
        setError(result.error);
      } else {
        onSuccess();
      }
    });
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

  return (
    <div style={{ display: "flex", flexDirection: "column" as const, gap: 20 }}>
      {/* Name */}
      <div>
        <label style={labelStyle}>Name</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Supplier name"
          style={inputStyle}
        />
      </div>

      {/* Service Category */}
      <div>
        <label style={labelStyle}>Service Category</label>
        <input
          type="text"
          value={serviceCategory}
          onChange={(e) => setServiceCategory(e.target.value)}
          placeholder="e.g., Floristry, Catering, Photography, Venues"
          style={inputStyle}
        />
      </div>

      {/* Email */}
      <div>
        <label style={labelStyle}>Email</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="email@example.com"
          style={inputStyle}
        />
      </div>

      {/* Phone */}
      <div>
        <label style={labelStyle}>Phone</label>
        <input
          type="text"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="Phone number"
          style={inputStyle}
        />
      </div>

      {/* Website */}
      <div>
        <label style={labelStyle}>Website</label>
        <input
          type="text"
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
          placeholder="https://example.com"
          style={inputStyle}
        />
      </div>

      {/* Notes */}
      <div>
        <label style={labelStyle}>Notes</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Additional notes..."
          rows={3}
          style={{
            ...inputStyle,
            height: "auto",
            padding: "8px 10px",
            resize: "vertical" as const,
          }}
        />
      </div>

      {/* Rating (edit mode only) */}
      {isEdit && (
        <div>
          <label style={labelStyle}>Rating</label>
          <StarRating value={rating} onChange={setRating} />
        </div>
      )}

      {/* Error */}
      {error && (
        <div style={{ fontSize: 12, color: "var(--amber)", padding: "8px 10px", borderRadius: 7, backgroundColor: "var(--amber-bg)", border: "1px solid var(--amber-border)" }}>
          {error}
        </div>
      )}

      {/* Submit */}
      <Button
        variant="primary"
        size="md"
        onClick={handleSubmit}
        disabled={isPending}
        style={{ width: "100%" }}
      >
        {isPending ? "Saving..." : isEdit ? "Update Supplier" : "Create Supplier"}
      </Button>
    </div>
  );
}
