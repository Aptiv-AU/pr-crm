const TEAL = "#006C49";

interface TrendDatum {
  sent: number;
  replied: number;
}

interface TrendChartProps {
  data: TrendDatum[];
  ariaLabel?: string;
}

export function TrendChart({ data, ariaLabel = "Outreach sent and replied over time" }: TrendChartProps) {
  const w = 600;
  const h = 180;
  const pad = { t: 12, r: 8, b: 20, l: 28 };
  const innerW = w - pad.l - pad.r;
  const innerH = h - pad.t - pad.b;

  if (data.length === 0) {
    return (
      <div
        style={{
          padding: "48px 0",
          textAlign: "center",
          fontSize: 12,
          fontStyle: "italic",
          fontWeight: 500,
          color: "var(--text-muted-custom)",
        }}
      >
        No outreach in this range yet.
      </div>
    );
  }

  const max = Math.max(1, ...data.flatMap((d) => [d.sent, d.replied]));
  const n = data.length;
  const stepX = n > 1 ? innerW / (n - 1) : 0;
  const x = (i: number) => pad.l + (n > 1 ? i * stepX : innerW / 2);
  const y = (v: number) => pad.t + innerH - (v / max) * innerH;

  const buildPath = (key: keyof TrendDatum) =>
    data
      .map((d, i) => `${i === 0 ? "M" : "L"} ${x(i).toFixed(1)} ${y(d[key]).toFixed(1)}`)
      .join(" ");

  const ticks = [0, Math.round(max / 2), max];

  return (
    <svg
      role="img"
      aria-label={ariaLabel}
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="none"
      style={{ width: "100%", height: 180, display: "block" }}
    >
      {ticks.map((t) => (
        <g key={t}>
          <line
            x1={pad.l}
            x2={w - pad.r}
            y1={y(t)}
            y2={y(t)}
            stroke="var(--border-custom)"
            strokeDasharray="2 4"
          />
          <text
            x={pad.l - 6}
            y={y(t) + 3}
            fontSize="10"
            textAnchor="end"
            fill="var(--text-muted-custom)"
            fontWeight="600"
          >
            {t}
          </text>
        </g>
      ))}
      <path
        d={buildPath("sent")}
        fill="none"
        stroke={TEAL}
        strokeWidth="2"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <path
        d={buildPath("replied")}
        fill="none"
        stroke="var(--text-sub)"
        strokeWidth="2"
        strokeDasharray="4 3"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}

export type { TrendChartProps, TrendDatum };
