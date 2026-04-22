"use client";

import { useState, useRef, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Icon } from "@/components/ui/icon";
import { SlideOverPanel } from "@/components/shared/slide-over-panel";
import { ClientForm } from "@/components/clients/client-form";

interface ClientOption {
  id: string;
  slug: string;
  name: string;
  industry: string;
  colour: string;
  bgColour: string;
  initials: string;
  logo?: string | null;
}

interface ClientSwitcherProps {
  clients: ClientOption[];
}

export function ClientSwitcher({ clients }: ClientSwitcherProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [slideOverOpen, setSlideOverOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Derive active client from URL (handle is either cuid or slug)
  const pathSegments = pathname.split("/");
  const clientsIndex = pathSegments.indexOf("clients");
  const activeHandle =
    clientsIndex !== -1 && pathSegments.length > clientsIndex + 1
      ? pathSegments[clientsIndex + 1]
      : undefined;

  const activeClient = activeHandle
    ? clients.find((c) => c.id === activeHandle || c.slug === activeHandle)
    : undefined;
  const activeClientId = activeClient?.id;

  // Close dropdown on click outside
  useEffect(() => {
    function handleMouseDown(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleMouseDown);
    }
    return () => document.removeEventListener("mousedown", handleMouseDown);
  }, [open]);

  // Close dropdown on route change
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  function handleSelect(handle?: string) {
    setOpen(false);
    if (handle) {
      router.push(`/clients/${handle}`);
    } else {
      router.push("/clients");
    }
  }

  return (
    <div className="relative mx-2 mb-1" ref={containerRef}>
      {/* Trigger */}
      <button
        onClick={() => setOpen((prev) => !prev)}
        className="flex items-center gap-2 w-full rounded-full px-3 py-2 cursor-pointer border-none"
        style={{
          backgroundColor: open ? "var(--active-bg)" : "var(--card-bg)",
          color: "var(--text-primary)",
        }}
        onMouseEnter={(e) => {
          if (!open) {
            e.currentTarget.style.backgroundColor = "var(--surface-container)";
          }
        }}
        onMouseLeave={(e) => {
          if (!open) {
            e.currentTarget.style.backgroundColor = "var(--card-bg)";
          }
        }}
      >
        {activeClient ? (
          activeClient.logo ? (
            <img
              src={activeClient.logo}
              alt={activeClient.name}
              className="shrink-0"
              style={{
                height: 20,
                maxWidth: 48,
                width: "auto",
                borderRadius: 3,
                objectFit: "contain",
              }}
            />
          ) : (
            <div
              className="flex items-center justify-center shrink-0 text-[9px] font-semibold"
              style={{
                width: 20,
                height: 20,
                borderRadius: 5,
                backgroundColor: activeClient.bgColour,
                color: activeClient.colour,
              }}
            >
              {activeClient.initials}
            </div>
          )
        ) : (
          <Icon name="workspace" size={14} color="var(--text-sub)" />
        )}
        <span
          className="text-[13px] font-medium flex-1 text-left truncate"
          style={{ color: "var(--text-primary)" }}
        >
          {activeClient ? activeClient.name : "All clients"}
        </span>
        <Icon name="chevronD" size={12} color="var(--text-muted-custom)" />
      </button>

      {/* Dropdown */}
      {open && (
        <div
          className="absolute left-0 right-0 rounded-xl overflow-hidden"
          style={{
            top: "calc(100% + 6px)",
            zIndex: 300,
            backgroundColor: "var(--card-bg)",
            boxShadow: "0 12px 32px rgba(15, 23, 42, 0.16)",
          }}
        >
          {/* All clients option */}
          <button
            onClick={() => handleSelect()}
            className="flex items-center gap-2 w-full px-2.5 py-[7px] cursor-pointer border-none text-left"
            style={{
              backgroundColor: !activeClientId
                ? "var(--accent-bg)"
                : "transparent",
              color: !activeClientId
                ? "var(--accent-text)"
                : "var(--text-primary)",
            }}
            onMouseEnter={(e) => {
              if (activeClientId) {
                e.currentTarget.style.backgroundColor = "var(--hover-bg)";
              }
            }}
            onMouseLeave={(e) => {
              if (activeClientId) {
                e.currentTarget.style.backgroundColor = "transparent";
              }
            }}
          >
            <Icon
              name="workspace"
              size={14}
              color={
                !activeClientId
                  ? "var(--accent-custom)"
                  : "var(--text-sub)"
              }
            />
            <span className="text-[13px] font-medium flex-1">All clients</span>
            {!activeClientId && (
              <Icon name="check" size={12} color="var(--accent-custom)" />
            )}
          </button>

          {/* Divider */}
          <div
            style={{
              height: 1,
              backgroundColor: "var(--border-custom)",
            }}
          />

          {/* Client list */}
          {clients.map((client) => {
            const isActive = activeClientId === client.id;
            return (
              <button
                key={client.id}
                onClick={() => handleSelect(client.slug)}
                className="flex items-center gap-2 w-full px-2.5 py-[7px] cursor-pointer border-none text-left"
                style={{
                  backgroundColor: isActive
                    ? "var(--accent-bg)"
                    : "transparent",
                  color: isActive
                    ? "var(--accent-text)"
                    : "var(--text-primary)",
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.backgroundColor = "var(--hover-bg)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.backgroundColor = "transparent";
                  }
                }}
              >
                {client.logo ? (
                  <img
                    src={client.logo}
                    alt={client.name}
                    className="shrink-0"
                    style={{
                      width: 20,
                      height: 20,
                      borderRadius: 5,
                      objectFit: "cover",
                    }}
                  />
                ) : (
                  <div
                    className="flex items-center justify-center shrink-0 text-[9px] font-semibold"
                    style={{
                      width: 20,
                      height: 20,
                      borderRadius: 5,
                      backgroundColor: client.bgColour,
                      color: client.colour,
                    }}
                  >
                    {client.initials}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-medium truncate">
                    {client.name}
                  </div>
                  <div
                    className="text-[11px] truncate"
                    style={{ color: isActive ? "var(--accent-text)" : "var(--text-muted-custom)" }}
                  >
                    {client.industry}
                  </div>
                </div>
                {isActive && (
                  <Icon name="check" size={12} color="var(--accent-custom)" />
                )}
              </button>
            );
          })}

          {/* Divider */}
          <div
            style={{
              height: 1,
              backgroundColor: "var(--border-custom)",
            }}
          />

          {/* Add new client */}
          <button
            onClick={() => {
              setOpen(false);
              setSlideOverOpen(true);
            }}
            className="flex items-center gap-2 w-full px-2.5 py-[7px] cursor-pointer border-none text-left"
            style={{
              backgroundColor: "transparent",
              color: "var(--text-sub)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "var(--hover-bg)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "transparent";
            }}
          >
            <Icon name="plus" size={14} color="var(--text-sub)" />
            <span className="text-[13px] font-medium">Add new client</span>
          </button>
        </div>
      )}

      {/* Slide-over for adding a new client */}
      <SlideOverPanel
        open={slideOverOpen}
        onClose={() => setSlideOverOpen(false)}
        title="New Client"
      >
        {slideOverOpen && (
          <ClientForm
            onSuccess={() => {
              setSlideOverOpen(false);
              router.refresh();
            }}
          />
        )}
      </SlideOverPanel>
    </div>
  );
}
