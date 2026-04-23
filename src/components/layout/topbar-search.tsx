"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
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

export function TopbarSearch({ width = 340 }: { width?: number }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [focused, setFocused] = useState(false);
  const [, startTransition] = useTransition();
  const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null);

  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>(null);
  const router = useRouter();

  const open = focused && query.length > 0;

  const updateAnchor = useCallback(() => {
    if (wrapperRef.current) setAnchorRect(wrapperRef.current.getBoundingClientRect());
  }, []);

  useEffect(() => {
    if (!open) return;
    updateAnchor();
    window.addEventListener("resize", updateAnchor);
    window.addEventListener("scroll", updateAnchor, true);
    return () => {
      window.removeEventListener("resize", updateAnchor);
      window.removeEventListener("scroll", updateAnchor, true);
    };
  }, [open, updateAnchor]);

  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (!wrapperRef.current?.contains(e.target as Node)) {
        setFocused(false);
      }
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  // Cmd/Ctrl+K focuses the inline search.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

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
      }, 200);
    },
    [startTransition]
  );

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    setQuery(val);
    doSearch(val);
  }

  function navigate(href: string) {
    setFocused(false);
    setQuery("");
    setResults([]);
    inputRef.current?.blur();
    router.push(href);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") {
      if (query) {
        setQuery("");
        setResults([]);
      } else {
        inputRef.current?.blur();
      }
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((p) => (p < results.length - 1 ? p + 1 : 0));
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((p) => (p > 0 ? p - 1 : results.length - 1));
    }
    if (e.key === "Enter" && activeIndex >= 0 && results[activeIndex]) {
      navigate(results[activeIndex].href);
    }
  }

  const grouped = sectionOrder
    .map((type) => ({
      type,
      label: sectionLabels[type],
      items: results.filter((r) => r.type === type),
    }))
    .filter((g) => g.items.length > 0);

  let flatIndex = 0;
  const indexMap = new Map<string, number>();
  grouped.forEach((g) =>
    g.items.forEach((item) => {
      indexMap.set(item.id, flatIndex++);
    })
  );

  const showDropdown = open;

  return (
    <div ref={wrapperRef} style={{ position: "relative" }}>
      <div
        className="inline-flex items-center gap-2.5"
        style={{
          height: 38,
          padding: "0 14px",
          width,
          borderRadius: 999,
          border: `1px solid ${focused ? "var(--accent-custom)" : "var(--border-custom)"}`,
          background: "var(--card-bg)",
          boxShadow: focused
            ? "0 0 0 3px color-mix(in srgb, var(--accent-custom) 18%, transparent)"
            : "0 1px 2px rgba(15,23,42,0.04)",
          transition: "box-shadow 120ms, border-color 120ms",
        }}
      >
        <Icon name="search" size={13} color="var(--text-sub)" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleInputChange}
          onFocus={() => setFocused(true)}
          onKeyDown={handleKeyDown}
          placeholder="Search clients, pitches, people…"
          style={{
            flex: 1,
            minWidth: 0,
            border: "none",
            outline: "none",
            background: "transparent",
            color: "var(--text-primary)",
            fontSize: 13,
            fontWeight: 500,
            lineHeight: "38px",
          }}
        />
        {query ? (
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              setQuery("");
              setResults([]);
              inputRef.current?.focus();
            }}
            aria-label="Clear search"
            className="inline-flex items-center justify-center border-none cursor-pointer"
            style={{
              width: 18,
              height: 18,
              borderRadius: "50%",
              background: "var(--surface-container-low)",
              color: "var(--text-muted-custom)",
              padding: 0,
              fontSize: 11,
              lineHeight: 1,
            }}
          >
            ×
          </button>
        ) : (
          <kbd
            style={{
              fontSize: 10,
              fontWeight: 700,
              padding: "2px 6px",
              borderRadius: 4,
              background: "var(--surface-container-low)",
              color: "var(--text-muted-custom)",
              fontFamily: "var(--font-mono)",
            }}
          >
            ⌘K
          </kbd>
        )}
      </div>

      {showDropdown && anchorRect && typeof document !== "undefined" &&
        createPortal(
          <div
            style={{
              position: "fixed",
              top: anchorRect.bottom + 6,
              left: anchorRect.left,
              width: anchorRect.width,
              maxHeight: 420,
              overflowY: "auto",
              borderRadius: 12,
              background: "var(--card-bg)",
              border: "1px solid var(--border-custom)",
              boxShadow: "0 12px 40px rgba(15,23,42,0.18), 0 1px 2px rgba(15,23,42,0.08)",
              zIndex: 80,
              padding: 4,
            }}
            onMouseDown={(e) => {
              // Prevent blur on input when clicking results.
              if (e.target !== e.currentTarget) e.preventDefault();
            }}
          >
            {query.length < 2 && (
              <div
                style={{
                  padding: "14px 14px",
                  fontSize: 12,
                  color: "var(--text-muted-custom)",
                }}
              >
                Keep typing…
              </div>
            )}

            {query.length >= 2 && results.length === 0 && (
              <div
                style={{
                  padding: "14px 14px",
                  fontSize: 12,
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
                    padding: "8px 12px 4px",
                    fontSize: 10,
                    fontWeight: 700,
                    color: "var(--text-muted-custom)",
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
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
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => navigate(item.href)}
                      onMouseEnter={() => setActiveIndex(idx)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        width: "100%",
                        padding: "7px 10px",
                        border: "none",
                        borderRadius: 8,
                        cursor: "pointer",
                        textAlign: "left",
                        background: isActive ? "var(--hover-bg)" : "transparent",
                      }}
                    >
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
                            background: "var(--hover-bg)",
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
                              fontSize: 11,
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

                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 500,
                          color: "var(--text-muted-custom)",
                          background: "var(--page-bg)",
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
          </div>,
          document.body
        )}
    </div>
  );
}
