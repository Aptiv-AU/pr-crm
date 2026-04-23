"use server";

import { db } from "@/lib/db";
import { action } from "@/lib/server/action";
import { requireOrgId } from "@/lib/server/org";
import type { RetainerCadence } from "@prisma/client";

const CADENCES: RetainerCadence[] = ["weekly", "fortnightly", "monthly"];

async function assertClientInOrg(clientId: string, orgId: string): Promise<void> {
  const found = await db.client.findFirst({
    where: { id: clientId, organizationId: orgId },
    select: { id: true },
  });
  if (!found) throw new Error("Client not found");
}

async function assertPeriodInOrg(periodId: string, orgId: string): Promise<string> {
  const found = await db.retainerPeriod.findFirst({
    where: { id: periodId, client: { organizationId: orgId } },
    select: { clientId: true },
  });
  if (!found) throw new Error("Retainer period not found");
  return found.clientId;
}

function parseDateInput(value: string | null): Date | null {
  if (!value) return null;
  // `yyyy-mm-dd` from <input type="date"> — anchor to noon UTC so it
  // lands on the same calendar day regardless of timezone.
  const d = new Date(`${value}T12:00:00Z`);
  return isNaN(d.getTime()) ? null : d;
}

function parseCadence(value: string | null): RetainerCadence {
  if (!value || !CADENCES.includes(value as RetainerCadence)) {
    throw new Error("Invalid cadence");
  }
  return value as RetainerCadence;
}

function parseAmountCents(value: string | null): number {
  if (!value) throw new Error("Amount is required");
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) throw new Error("Amount must be a positive number");
  // Input is dollars; persist as cents.
  return Math.round(n * 100);
}

export const createRetainerPeriod = action(
  "createRetainerPeriod",
  async (clientId: string, formData: FormData) => {
    const organizationId = await requireOrgId();
    await assertClientInOrg(clientId, organizationId);

    const cadence = parseCadence(formData.get("cadence") as string | null);
    const amount = parseAmountCents(formData.get("amount") as string | null);
    const startDate = parseDateInput(formData.get("startDate") as string | null);
    const endDate = parseDateInput(formData.get("endDate") as string | null);
    const note = (formData.get("note") as string | null)?.trim() || null;

    if (!startDate) throw new Error("Start date is required");
    if (endDate && endDate < startDate) throw new Error("End date must be after start date");

    await db.retainerPeriod.create({
      data: { clientId, cadence, amount, startDate, endDate, note },
    });

    return {
      revalidate: ["/clients", `/clients/${clientId}`],
      revalidateTags: [`clients:${organizationId}`],
    };
  },
);

export const updateRetainerPeriod = action(
  "updateRetainerPeriod",
  async (periodId: string, formData: FormData) => {
    const organizationId = await requireOrgId();
    const clientId = await assertPeriodInOrg(periodId, organizationId);

    const cadence = parseCadence(formData.get("cadence") as string | null);
    const amount = parseAmountCents(formData.get("amount") as string | null);
    const startDate = parseDateInput(formData.get("startDate") as string | null);
    const endDate = parseDateInput(formData.get("endDate") as string | null);
    const note = (formData.get("note") as string | null)?.trim() || null;

    if (!startDate) throw new Error("Start date is required");
    if (endDate && endDate < startDate) throw new Error("End date must be after start date");

    await db.retainerPeriod.update({
      where: { id: periodId },
      data: { cadence, amount, startDate, endDate, note },
    });

    return {
      revalidate: ["/clients", `/clients/${clientId}`],
      revalidateTags: [`clients:${organizationId}`],
    };
  },
);

export const deleteRetainerPeriod = action(
  "deleteRetainerPeriod",
  async (periodId: string) => {
    const organizationId = await requireOrgId();
    const clientId = await assertPeriodInOrg(periodId, organizationId);

    await db.retainerPeriod.delete({ where: { id: periodId } });

    return {
      revalidate: ["/clients", `/clients/${clientId}`],
      revalidateTags: [`clients:${organizationId}`],
    };
  },
);
