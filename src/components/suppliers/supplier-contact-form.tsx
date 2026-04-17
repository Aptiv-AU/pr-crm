"use client";

import { useState, useTransition } from "react";
import { createSupplierContact, updateSupplierContact } from "@/actions/supplier-actions";
import { Button } from "@/components/ui/button";

interface SupplierContactFormProps {
  supplierContact?: {
    id: string;
    name: string;
    role: string | null;
    email: string | null;
    phone: string | null;
  } | null;
  supplierId: string;
  onSuccess: () => void;
}

export function SupplierContactForm({ supplierContact, supplierId, onSuccess }: SupplierContactFormProps) {
  const isEdit = !!supplierContact;
  const [name, setName] = useState(supplierContact?.name ?? "");
  const [role, setRole] = useState(supplierContact?.role ?? "");
  const [email, setEmail] = useState(supplierContact?.email ?? "");
  const [phone, setPhone] = useState(supplierContact?.phone ?? "");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit() {
    setError(null);
    startTransition(async () => {
      const formData = new FormData();
      formData.set("name", name);
      formData.set("role", role);
      formData.set("email", email);
      formData.set("phone", phone);
      formData.set("supplierId", supplierId);

      const result = isEdit
        ? await updateSupplierContact(supplierContact!.id, formData)
        : await createSupplierContact(formData);

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
          placeholder="Contact name"
          style={inputStyle}
        />
      </div>

      {/* Role */}
      <div>
        <label style={labelStyle}>Role</label>
        <input
          type="text"
          value={role}
          onChange={(e) => setRole(e.target.value)}
          placeholder="e.g., Account Manager, Owner"
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
        {isPending ? "Saving..." : isEdit ? "Update Contact" : "Add Contact"}
      </Button>
    </div>
  );
}
