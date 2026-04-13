"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/icon";
import { SlideOverPanel } from "@/components/shared/slide-over-panel";
import { ClientForm } from "@/components/workspaces/client-form";

export function AddClientButton() {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  function handleSuccess() {
    setOpen(false);
    router.refresh();
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full rounded-[10px] cursor-pointer transition-colors"
        style={{
          border: "2px dashed var(--border-custom)",
          backgroundColor: "transparent",
          padding: "20px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLElement).style.backgroundColor = "var(--hover-bg)";
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLElement).style.backgroundColor = "transparent";
        }}
      >
        <Icon name="plus" size={14} color="var(--text-muted-custom)" />
        <span
          style={{
            fontSize: 13,
            fontWeight: 500,
            color: "var(--text-muted-custom)",
          }}
        >
          Add new client workspace
        </span>
      </button>

      <SlideOverPanel open={open} onClose={() => setOpen(false)} title="New Client">
        <ClientForm onSuccess={handleSuccess} />
      </SlideOverPanel>
    </>
  );
}
