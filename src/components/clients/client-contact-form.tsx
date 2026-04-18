"use client";

import { useEffect, useState, useTransition } from "react";
import {
  createClientContact,
  updateClientContact,
} from "@/actions/client-actions";
import { Button } from "@/components/ui/button";

export interface ClientContactFormContact {
  id: string;
  name: string;
  role: string | null;
  email: string | null;
  phone: string | null;
  notes: string | null;
  isPrimary: boolean;
}

interface ClientContactFormProps {
  open: boolean;
  clientId: string;
  clientContact?: ClientContactFormContact | null;
  onClose: () => void;
  onSuccess: () => void;
}

export function ClientContactForm({
  open,
  clientId,
  clientContact,
  onClose,
  onSuccess,
}: ClientContactFormProps) {
  const isEdit = !!clientContact;
  const [name, setName] = useState(clientContact?.name ?? "");
  const [role, setRole] = useState(clientContact?.role ?? "");
  const [email, setEmail] = useState(clientContact?.email ?? "");
  const [phone, setPhone] = useState(clientContact?.phone ?? "");
  const [notes, setNotes] = useState(clientContact?.notes ?? "");
  const [isPrimary, setIsPrimary] = useState(clientContact?.isPrimary ?? false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      setName(clientContact?.name ?? "");
      setRole(clientContact?.role ?? "");
      setEmail(clientContact?.email ?? "");
      setPhone(clientContact?.phone ?? "");
      setNotes(clientContact?.notes ?? "");
      setIsPrimary(clientContact?.isPrimary ?? false);
      setError(null);
    });
    return () => {
      cancelled = true;
    };
  }, [open, clientContact]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !isPending) onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, isPending, onClose]);

  if (!open) return null;

  function handleSubmit() {
    setError(null);
    if (!name.trim()) {
      setError("Name is required");
      return;
    }
    startTransition(async () => {
      const formData = new FormData();
      formData.set("name", name);
      formData.set("role", role);
      formData.set("email", email);
      formData.set("phone", phone);
      formData.set("notes", notes);
      formData.set("isPrimary", isPrimary ? "true" : "false");
      formData.set("clientId", clientId);

      const result = isEdit
        ? await updateClientContact(clientContact!.id, formData)
        : await createClientContact(formData);

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
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "var(--overlay)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 50,
      }}
      onClick={() => {
        if (!isPending) onClose();
      }}
    >
      <div
        style={{
          backgroundColor: "var(--card-bg)",
          borderRadius: 12,
          padding: 24,
          maxWidth: 460,
          width: "100%",
          margin: "0 16px",
          border: "1px solid var(--border-custom)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            fontSize: 15,
            fontWeight: 600,
            color: "var(--text-primary)",
            marginBottom: 4,
          }}
        >
          {isEdit ? "Edit key contact" : "Add key contact"}
        </div>
        <div
          style={{
            fontSize: 12,
            color: "var(--text-sub)",
            marginBottom: 20,
          }}
        >
          The person you liaise with at this client.
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <label style={labelStyle}>Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Contact name"
              style={inputStyle}
              autoFocus
            />
          </div>

          <div>
            <label style={labelStyle}>Role</label>
            <input
              type="text"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              placeholder="e.g., Marketing Director"
              style={inputStyle}
            />
          </div>

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

          <div>
            <label style={labelStyle}>Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Preferences, context, anything worth remembering"
              rows={3}
              style={{
                ...inputStyle,
                height: "auto",
                padding: "8px 10px",
                fontFamily: "inherit",
                resize: "vertical",
              }}
            />
          </div>

          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              fontSize: 13,
              color: "var(--text-primary)",
              cursor: "pointer",
            }}
          >
            <input
              type="checkbox"
              checked={isPrimary}
              onChange={(e) => setIsPrimary(e.target.checked)}
            />
            Primary contact
          </label>

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

          <div
            style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}
          >
            <Button
              variant="default"
              size="sm"
              onClick={onClose}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleSubmit}
              disabled={isPending}
            >
              {isPending
                ? "Saving..."
                : isEdit
                  ? "Update contact"
                  : "Add contact"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
