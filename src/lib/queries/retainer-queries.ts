import { db } from "@/lib/db";
import { activePeriodOn, monthlyEquivalentCents } from "@/lib/retainer";

export async function getRetainerPeriods(clientId: string) {
  return db.retainerPeriod.findMany({
    where: { clientId },
    orderBy: { startDate: "asc" },
  });
}

export async function getActiveRetainerMonthlyCents(clientId: string): Promise<number> {
  const periods = await db.retainerPeriod.findMany({
    where: { clientId },
    select: { cadence: true, amount: true, startDate: true, endDate: true },
  });
  const active = activePeriodOn(periods);
  return active ? monthlyEquivalentCents(active.cadence, active.amount) : 0;
}

/**
 * Sum of each client's currently-active retainer period, normalised to
 * a monthly figure (in cents). Clients without an active period
 * contribute zero.
 */
export async function getTotalMonthlyRetainerCents(
  organizationId: string
): Promise<number> {
  const periods = await db.retainerPeriod.findMany({
    where: { client: { organizationId, archivedAt: null } },
    select: {
      clientId: true,
      cadence: true,
      amount: true,
      startDate: true,
      endDate: true,
    },
  });

  const byClient = new Map<string, typeof periods>();
  for (const p of periods) {
    const bucket = byClient.get(p.clientId) ?? [];
    bucket.push(p);
    byClient.set(p.clientId, bucket);
  }

  let total = 0;
  for (const bucket of byClient.values()) {
    const active = activePeriodOn(bucket);
    if (active) total += monthlyEquivalentCents(active.cadence, active.amount);
  }
  return total;
}

export async function getActiveRetainerByClientIds(
  clientIds: string[]
): Promise<Map<string, { monthlyCents: number; cadence: string; amountCents: number }>> {
  if (clientIds.length === 0) return new Map();
  const periods = await db.retainerPeriod.findMany({
    where: { clientId: { in: clientIds } },
    select: {
      clientId: true,
      cadence: true,
      amount: true,
      startDate: true,
      endDate: true,
    },
  });
  const byClient = new Map<string, typeof periods>();
  for (const p of periods) {
    const bucket = byClient.get(p.clientId) ?? [];
    bucket.push(p);
    byClient.set(p.clientId, bucket);
  }
  const out = new Map<string, { monthlyCents: number; cadence: string; amountCents: number }>();
  for (const [clientId, bucket] of byClient) {
    const active = activePeriodOn(bucket);
    if (active) {
      out.set(clientId, {
        monthlyCents: monthlyEquivalentCents(active.cadence, active.amount),
        cadence: active.cadence,
        amountCents: active.amount,
      });
    }
  }
  return out;
}
