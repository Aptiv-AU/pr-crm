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
    <div className="grid grid-cols-2 md:grid-cols-4 gap-[10px]">
      {stats.map((stat) => (
        <Card key={stat.label} style={{ padding: "14px 16px" }}>
          <div
            style={{
              fontSize: 16,
              fontWeight: 700,
              color: "var(--text-primary)",
              letterSpacing: "-0.02em",
              lineHeight: 1.2,
            }}
            className="md:text-[20px]"
          >
            {stat.value}
          </div>
          <div
            style={{
              fontSize: 12,
              fontWeight: 500,
              color: "var(--text-sub)",
              marginTop: 2,
            }}
          >
            {stat.label}
          </div>
          {stat.sublabel && (
            <div
              style={{
                fontSize: 11,
                color: "var(--text-muted-custom)",
                marginTop: 1,
              }}
            >
              {stat.sublabel}
            </div>
          )}
        </Card>
      ))}
    </div>
  );
}
