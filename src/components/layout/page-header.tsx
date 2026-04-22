import type { ReactNode } from "react";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  kicker?: string;
  actions?: ReactNode;
}

export function PageHeader({ title, subtitle, kicker, actions }: PageHeaderProps) {
  return (
    <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
      <div className="flex flex-col gap-2">
        {kicker && (
          <span
            className="text-[10px] font-bold uppercase tracking-[0.18em]"
            style={{ color: "var(--text-muted-custom)" }}
          >
            {kicker}
          </span>
        )}
        <h2
          className="text-4xl font-extrabold tracking-tight"
          style={{ color: "var(--text-primary)" }}
        >
          {title}
        </h2>
        {subtitle && (
          <p className="font-medium italic" style={{ color: "var(--text-sub)" }}>
            {subtitle}
          </p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

interface PageContainerProps {
  children: ReactNode;
}

export function PageContainer({ children }: PageContainerProps) {
  return (
    <div className="px-6 py-8 md:px-10 md:py-10 max-w-[1600px] mx-auto space-y-8">
      {children}
    </div>
  );
}
