import { Card } from "@/components/ui/card";

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
    <div className="grid grid-cols-2 md:grid-cols-4 gap-[6px] md:gap-[10px]">
      {stats.map((stat) => (
        <Card
          key={stat.label}
          className="px-[10px] py-[6px] md:px-4 md:py-[14px]"
        >
          <div
            style={{
              fontWeight: 700,
              color: "var(--text-primary)",
              letterSpacing: "-0.02em",
              lineHeight: 1.2,
            }}
            className="text-[14px] md:text-[20px]"
          >
            {stat.value}
          </div>
          <div
            style={{
              fontWeight: 500,
              color: "var(--text-sub)",
            }}
            className="text-[10px] md:text-[12px] mt-0 md:mt-[2px]"
          >
            {stat.label}
          </div>
          {stat.sublabel && (
            <div
              style={{
                color: "var(--text-muted-custom)",
              }}
              className="hidden md:block text-[11px] mt-[1px]"
            >
              {stat.sublabel}
            </div>
          )}
        </Card>
      ))}
    </div>
  );
}
