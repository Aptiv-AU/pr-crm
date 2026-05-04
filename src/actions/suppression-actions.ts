"use server";

import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { action } from "@/lib/server/action";
import { requireOrgId } from "@/lib/server/org";
import { requireRole } from "@/lib/server/role";

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
    const organizationId = await requireOrgId();
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
  const organizationId = await requireOrgId();
  // Removing a suppression re-enables sends to a previously opted-out
  // address — gate to org admins so a low-trust account can't undo
  // unsubscribes (CAN-SPAM / Australian Spam Act exposure).
  await requireRole(["owner", "admin"]);
  const existing = await db.suppression.findFirst({
    where: { id, organizationId },
    select: { id: true },
  });
  if (!existing) throw new Error("Suppression not found");

  await db.suppression.delete({ where: { id } });
  return { revalidate: ["/settings/suppressions"] };
});

export async function listSuppressions() {
  const organizationId = await requireOrgId();
  return db.suppression.findMany({
    where: { organizationId },
    orderBy: { createdAt: "desc" },
  });
}
