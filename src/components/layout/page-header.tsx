import type { ReactNode } from "react";

const TEAL = "#006C49";
const TEAL_BG = "#E3F5EC";
const TEAL_TEXT = "#00281A";
const TEAL_SUB = "#1B5240";

interface PageHeaderMeta {
  label: string;
  value: string;
}

interface PageHeaderProps {
  /** Pill eyebrow label (e.g. "Workspace", "Directory"). */
  eyebrow?: string;
  /** @deprecated use {@link eyebrow} */
  kicker?: string;
  title: string;
  subtitle?: string;
  /** Label/value pairs rendered in a meta strip under the title. */
  meta?: PageHeaderMeta[];
  actions?: ReactNode;
}

/**
 * Editorial hero page header — tinted teal backdrop, 3px accent rail,
 * faint monogram from the title's first character, pill eyebrow.
 */
export function PageHeader({ eyebrow, kicker, title, subtitle, meta, actions }: PageHeaderProps) {
  const tag = eyebrow ?? kicker;
  const monogram = title?.[0] ?? "";

  return (
    <div
      className="relative overflow-hidden"
      style={{
        background: TEAL_BG,
        borderRadius: 16,
        padding: "28px 28px 24px 34px",
      }}
    >
      <span
        aria-hidden
        className="absolute left-0 rounded-sm"
        style={{ top: 20, bottom: 20, width: 3, background: TEAL }}
      />
      <span
        aria-hidden
        className="absolute pointer-events-none font-extrabold select-none"
        style={{
          right: -20,
          top: -40,
          fontSize: 180,
          letterSpacing: "-0.08em",
          color: TEAL,
          opacity: 0.06,
          lineHeight: 1,
          fontFamily: "var(--font-sans)",
        }}
      >
        {monogram}
      </span>

      <div className="relative flex items-start justify-between gap-5 flex-wrap">
        <div className="min-w-0" style={{ maxWidth: 620 }}>
          {tag && (
            <div
              className="inline-flex items-center gap-2 mb-3"
              style={{
                padding: "3px 10px",
                borderRadius: 999,
                background: "rgba(255,255,255,0.65)",
              }}
            >
              <span
                aria-hidden
                className="rounded-full"
                style={{ width: 6, height: 6, background: TEAL }}
              />
              <span
                className="font-extrabold uppercase"
                style={{
                  fontSize: 10,
                  letterSpacing: "0.14em",
                  color: "#00422B",
                }}
              >
                {tag}
              </span>
            </div>
          )}
          <h1
            className="font-extrabold m-0"
            style={{
              fontSize: 32,
              letterSpacing: "-0.025em",
              lineHeight: 1.08,
              color: TEAL_TEXT,
            }}
          >
            {title}
          </h1>
          {subtitle && (
            <div
              className="italic font-medium"
              style={{
                fontSize: 14,
                color: TEAL_SUB,
                marginTop: 10,
                lineHeight: 1.45,
              }}
            >
              {subtitle}
            </div>
          )}
        </div>
        {actions && (
          <div className="flex gap-2 flex-wrap shrink-0 items-center">{actions}</div>
        )}
      </div>

      {meta && meta.length > 0 && (
        <div className="relative flex flex-wrap gap-7" style={{ marginTop: 18 }}>
          {meta.map((m, i) => (
            <div key={i} className="whitespace-nowrap">
              <div
                className="uppercase font-extrabold whitespace-nowrap"
                style={{
                  fontSize: 9,
                  letterSpacing: "0.14em",
                  color: TEAL_SUB,
                  opacity: 0.75,
                }}
              >
                {m.label}
              </div>
              <div
                className="font-extrabold whitespace-nowrap"
                style={{
                  fontSize: 15,
                  marginTop: 4,
                  letterSpacing: "-0.01em",
                  color: TEAL_TEXT,
                }}
              >
                {m.value}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

interface PageContainerProps {
  children: ReactNode;
}

export function PageContainer({ children }: PageContainerProps) {
  return (
    <div className="px-6 py-8 md:px-8 md:py-7 max-w-[1600px] mx-auto flex flex-col gap-6">
      {children}
    </div>
  );
}

export type { PageHeaderMeta, PageHeaderProps };
