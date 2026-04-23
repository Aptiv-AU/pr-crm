import { Card } from "@/components/ui/card";

interface StatCardProps {
  label: string;
  value: string | number;
  sublabel?: string;
}

export function StatCard({ label, value, sublabel }: StatCardProps) {
  return (
    <Card style={{ padding: "18px 20px" }}>
      <div
        style={{
          fontSize: 10,
          fontWeight: 800,
          textTransform: "uppercase",
          letterSpacing: "0.12em",
          color: "var(--text-muted-custom)",
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: 32,
          fontWeight: 800,
          letterSpacing: "-0.02em",
          marginTop: 10,
          color: "var(--text-primary)",
          lineHeight: 1.05,
        }}
      >
        {typeof value === "number" ? value.toLocaleString() : value}
      </div>
      {sublabel && (
        <div
          style={{
            fontSize: 12,
            color: "var(--text-sub)",
            marginTop: 4,
            fontWeight: 500,
          }}
        >
          {sublabel}
        </div>
      )}
    </Card>
  );
}

export type { StatCardProps };
