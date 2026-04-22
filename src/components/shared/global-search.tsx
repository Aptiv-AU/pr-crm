"use client";

import { useState, useEffect, useRef, useCallback, useTransition } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/icon";
import { globalSearch } from "@/actions/search-actions";

interface SearchResult {
  type: "client" | "contact" | "campaign" | "supplier";
  id: string;
  title: string;
  subtitle: string;
  href: string;
  initials?: string;
  colour?: string;
  bgColour?: string;
  photo?: string | null;
}

const typeLabels: Record<string, string> = {
  client: "Client",
  contact: "Contact",
  campaign: "Campaign",
  supplier: "Supplier",
};

const sectionOrder = ["client", "contact", "campaign", "supplier"] as const;

const sectionLabels: Record<string, string> = {
  client: "Clients",
  contact: "Contacts",
  campaign: "Campaigns",
  supplier: "Suppliers",
};

const typeIcons: Record<string, "workspace" | "contacts" | "campaigns" | "suppliers"> = {
  client: "workspace",
  contact: "contacts",
  campaign: "campaigns",
  supplier: "suppliers",
};

export function GlobalSearch() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Register Cmd+K and custom event
  useEffect(() => {
    function handleOpen() {
      setIsOpen(true);
    }
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
    }
    window.addEventListener("open-search", handleOpen);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("open-search", handleOpen);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
      setTimeout(() => inputRef.current?.focus(), 0);
    } else {
      document.body.style.overflow = "";
      setQuery("");
      setResults([]);
      setActiveIndex(-1);
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  const flatResults = results;

  const doSearch = useCallback(
    (q: string) => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (!q || q.length < 2) {
        setResults([]);
        setActiveIndex(-1);
        return;
      }
      timeoutRef.current = setTimeout(() => {
        startTransition(async () => {
          const res = await globalSearch(q);
          setResults(res);
          setActiveIndex(res.length > 0 ? 0 : -1);
        });
      }, 300);
    },
    [startTransition]
  );

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    setQuery(val);
    doSearch(val);
  }

  function navigate(href: string) {
    setIsOpen(false);
    router.push(href);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") {
      setIsOpen(false);
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((prev) => (prev < flatResults.length - 1 ? prev + 1 : 0));
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((prev) => (prev > 0 ? prev - 1 : flatResults.length - 1));
    }
    if (e.key === "Enter" && activeIndex >= 0 && flatResults[activeIndex]) {
      navigate(flatResults[activeIndex].href);
    }
  }

  // Scroll active item into view
  useEffect(() => {
    if (activeIndex >= 0 && resultsRef.current) {
      const el = resultsRef.current.querySelector(`[data-index="${activeIndex}"]`);
      el?.scrollIntoView({ block: "nearest" });
    }
  }, [activeIndex]);

  // Group results by type
  const grouped = sectionOrder
    .map((type) => ({
      type,
      label: sectionLabels[type],
      items: flatResults.filter((r) => r.type === type),
    }))
    .filter((g) => g.items.length > 0);

  // Build flat index map for keyboard nav
  let flatIndex = 0;
  const indexMap = new Map<string, number>();
  grouped.forEach((g) =>
    g.items.forEach((item) => {
      indexMap.set(item.id, flatIndex++);
    })
  );

  if (typeof window === "undefined") return null;
  if (!isOpen) return null;

  return createPortal(
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        backgroundColor: "var(--overlay)",
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        paddingTop: "min(20vh, 140px)",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) setIsOpen(false);
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 560,
          maxHeight: 460,
          borderRadius: 16,
          backgroundColor: "var(--card-bg)",
          boxShadow: "0 20px 60px rgba(15, 23, 42, 0.24)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
        onKeyDown={handleKeyDown}
      >
        {/* Search input */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "0 14px",
            height: 44,
            borderBottom: "1px solid var(--border-custom)",
            flexShrink: 0,
          }}
        >
          <Icon name="search" size={15} color="var(--text-muted-custom)" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={handleInputChange}
            placeholder="Search clients, contacts, campaigns..."
            style={{
              flex: 1,
              border: "none",
              outline: "none",
              backgroundColor: "transparent",
              color: "var(--text-primary)",
              fontSize: 15,
              lineHeight: "44px",
            }}
          />
          <span
            style={{
              fontSize: 11,
              fontWeight: 500,
              color: "var(--text-muted-custom)",
              backgroundColor: "var(--hover-bg)",
              borderRadius: 4,
              padding: "2px 6px",
            }}
          >
            ESC
          </span>
        </div>

        {/* Results */}
        <div
          ref={resultsRef}
          style={{
            flex: 1,
            overflowY: "auto",
            maxHeight: 376,
          }}
        >
          {query.length < 2 && (
            <div
              style={{
                padding: "32px 16px",
                textAlign: "center",
                fontSize: 13,
                color: "var(--text-muted-custom)",
              }}
            >
              Type to search...
            </div>
          )}

          {query.length >= 2 && flatResults.length === 0 && (
            <div
              style={{
                padding: "32px 16px",
                textAlign: "center",
                fontSize: 13,
                color: "var(--text-muted-custom)",
              }}
            >
              No results for &lsquo;{query}&rsquo;
            </div>
          )}

          {grouped.map((group) => (
            <div key={group.type}>
              <div
                style={{
                  padding: "8px 14px 4px",
                  fontSize: 11,
                  fontWeight: 600,
                  color: "var(--text-muted-custom)",
                  textTransform: "uppercase",
                  letterSpacing: "0.03em",
                }}
              >
                {group.label}
              </div>
              {group.items.map((item) => {
                const idx = indexMap.get(item.id) ?? -1;
                const isActive = idx === activeIndex;
                return (
                  <button
                    key={item.id}
                    data-index={idx}
                    onClick={() => navigate(item.href)}
                    onMouseEnter={() => setActiveIndex(idx)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      width: "100%",
                      padding: "7px 14px",
                      border: "none",
                      cursor: "pointer",
                      textAlign: "left",
                      backgroundColor: isActive ? "var(--hover-bg)" : "transparent",
                    }}
                  >
                    {/* Avatar / Icon */}
                    {item.photo ? (
                      <img
                        src={item.photo}
                        alt=""
                        style={{
                          width: 22,
                          height: 22,
                          borderRadius: "50%",
                          objectFit: "cover",
                          flexShrink: 0,
                        }}
                      />
                    ) : item.initials ? (
                      <div
                        style={{
                          width: 22,
                          height: 22,
                          borderRadius: item.type === "client" ? 4 : "50%",
                          backgroundColor: item.bgColour || "var(--accent-custom)",
                          color: item.colour || "#fff",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 9,
                          fontWeight: 600,
                          flexShrink: 0,
                        }}
                      >
                        {item.initials}
                      </div>
                    ) : (
                      <div
                        style={{
                          width: 22,
                          height: 22,
                          borderRadius: 4,
                          backgroundColor: "var(--hover-bg)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                        }}
                      >
                        <Icon
                          name={typeIcons[item.type]}
                          size={13}
                          color="var(--text-sub)"
                        />
                      </div>
                    )}

                    {/* Title + Subtitle */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: 13,
                          fontWeight: 500,
                          color: "var(--text-primary)",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {item.title}
                      </div>
                      {item.subtitle && (
                        <div
                          style={{
                            fontSize: 12,
                            color: "var(--text-sub)",
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                        >
                          {item.subtitle}
                        </div>
                      )}
                    </div>

                    {/* Type badge */}
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 500,
                        color: "var(--text-muted-custom)",
                        backgroundColor: "var(--page-bg)",
                        border: "1px solid var(--border-custom)",
                        borderRadius: 4,
                        padding: "1px 6px",
                        flexShrink: 0,
                      }}
                    >
                      {typeLabels[item.type]}
                    </span>
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>,
    document.body
  );
}
