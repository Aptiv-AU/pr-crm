import type { RetainerCadence, RetainerPeriod } from "@prisma/client";

export const CADENCE_LABEL: Record<RetainerCadence, string> = {
  weekly: "Weekly",
  fortnightly: "Fortnightly",
  monthly: "Monthly",
};

export const CADENCE_SUFFIX: Record<RetainerCadence, string> = {
  weekly: "/wk",
  fortnightly: "/fn",
  monthly: "/mo",
};

// Average weeks per month = 52 / 12 ≈ 4.3333.
const MONTHLY_MULTIPLIER: Record<RetainerCadence, number> = {
  weekly: 52 / 12,
  fortnightly: 26 / 12,
  monthly: 1,
};

export function monthlyEquivalentCents(
  cadence: RetainerCadence,
  amountCents: number
): number {
  return Math.round(amountCents * MONTHLY_MULTIPLIER[cadence]);
}

export function activePeriodOn<T extends Pick<RetainerPeriod, "startDate" | "endDate">>(
  periods: T[],
  on: Date = new Date()
): T | null {
  const d = on.getTime();
  const covering = periods.filter((p) => {
    const start = new Date(p.startDate).getTime();
    const end = p.endDate ? new Date(p.endDate).getTime() : Infinity;
    return start <= d && d <= end;
  });
  if (covering.length === 0) return null;
  // When ranges overlap, prefer the period that started most recently —
  // a "Black Friday uplift" sitting on top of an ongoing base retainer
  // wins because its startDate is later. Tiebreaker: shorter period
  // (explicit end date) over open-ended.
  covering.sort((a, b) => {
    const diff =
      new Date(b.startDate).getTime() - new Date(a.startDate).getTime();
    if (diff !== 0) return diff;
    const aOpen = !a.endDate;
    const bOpen = !b.endDate;
    if (aOpen === bOpen) return 0;
    return aOpen ? 1 : -1;
  });
  return covering[0] ?? null;
}

export function formatCurrency(
  amountCents: number,
  currency = "AUD",
  locale = "en-AU"
): string {
  const formatter = new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  });
  return formatter.format(amountCents / 100);
}

export function formatCompactCurrency(
  amountCents: number,
  currency = "AUD",
  locale = "en-AU"
): string {
  const dollars = amountCents / 100;
  const symbol = currency === "AUD" ? "A$" : "$";
  if (dollars >= 10_000) return `${symbol}${Math.round(dollars / 1000)}k`;
  if (dollars >= 1000) return `${symbol}${(dollars / 1000).toFixed(1)}k`;
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(dollars);
}
