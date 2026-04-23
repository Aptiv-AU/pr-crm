import { Card } from "@/components/ui/card";
import { TrendChart, type TrendDatum } from "./trend-chart";

const TEAL = "#006C49";

interface TrendPanelProps {
  data: TrendDatum[];
}

export function TrendPanel({ data }: TrendPanelProps) {
  return (
    <Card style={{ padding: 20 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 16,
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <span
          style={{
            fontSize: 10,
            fontWeight: 800,
            textTransform: "uppercase",
            letterSpacing: "0.12em",
            color: "var(--text-muted-custom)",
          }}
        >
          Activity over time
        </span>
        <div
          style={{
            display: "flex",
            gap: 16,
            fontSize: 11,
            color: "var(--text-sub)",
            fontWeight: 600,
          }}
        >
          <LegendDot color={TEAL} label="Sent" />
          <LegendDot color="var(--text-sub)" label="Replied" />
        </div>
      </div>
      <TrendChart data={data} />
    </Card>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
      <span
        aria-hidden
        style={{ width: 8, height: 8, borderRadius: 999, background: color }}
      />
      {label}
    </span>
  );
}

export type { TrendPanelProps };
