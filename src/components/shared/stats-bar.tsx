interface Stat {
  value: string | number;
  label: string;
  sublabel?: string;
}

interface StatsBarProps {
  stats: Stat[];
}

export function StatsBar({ stats }: StatsBarProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className="rounded-xl px-4 py-4 md:px-5 md:py-5"
          style={{
            backgroundColor: "var(--card-bg)",
            boxShadow: "0 1px 2px rgba(15, 23, 42, 0.04)",
          }}
        >
          <div
            className="text-[10px] font-black uppercase tracking-[0.14em]"
            style={{ color: "var(--text-muted-custom)" }}
          >
            {stat.label}
          </div>
          <div
            className="text-2xl md:text-[32px] leading-none font-extrabold tracking-tight mt-2"
            style={{ color: "var(--text-primary)" }}
          >
            {stat.value}
          </div>
          {stat.sublabel && (
            <div
              className="hidden md:block text-[11px] italic font-medium mt-1.5"
              style={{ color: "var(--accent-custom)" }}
            >
              {stat.sublabel}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
