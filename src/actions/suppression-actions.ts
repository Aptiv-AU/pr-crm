"use server";

import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { action } from "@/lib/server/action";

async function orgId() {
  const org = await db.organization.findFirst();
  if (!org) throw new Error("no org");
  return org.id;
}

export const addSuppression = action(
  "addSuppression",
  async ({
    email,
    reason,
    note,
  }: {
    email: string;
    reason: "reply_request" | "manual";
    note?: string;
  }) => {
    const session = await auth();
    const organizationId = await orgId();
    const normalised = email.trim().toLowerCase();
    if (!normalised) throw new Error("Email required");

    await db.suppression.upsert({
      where: { organizationId_email: { organizationId, email: normalised } },
      create: {
        organizationId,
        email: normalised,
        reason,
        note,
        createdByUserId: session?.user?.id ?? null,
      },
      update: { reason, note },
    });
    return { revalidate: ["/settings/suppressions"] };
  }
);

export const removeSuppression = action("removeSuppression", async (id: string) => {
  await db.suppression.delete({ where: { id } });
  return { revalidate: ["/settings/suppressions"] };
});

export async function listSuppressions() {
  const organizationId = await orgId();
  return db.suppression.findMany({
    where: { organizationId },
    orderBy: { createdAt: "desc" },
  });
}
