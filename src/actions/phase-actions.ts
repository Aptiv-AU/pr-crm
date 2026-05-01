"use server";

import { db } from "@/lib/db";
import { CampaignStatus, PhaseStatus, Prisma } from "@prisma/client";
import { action } from "@/lib/server/action";
import { requireOrgId } from "@/lib/server/org";

/**
 * Allowed phase transitions. The phase state machine is strictly
 * sequential: a row can only enter `active` from `pending`, and only
 * enter `complete` from `active`. `revertToPhase` handles the legitimate
 * reverse path (with a $transaction).
 */
function isLegalTransition(from: PhaseStatus, to: PhaseStatus): boolean {
  if (from === to) return true;
  if (from === PhaseStatus.pending && to === PhaseStatus.active) return true;
  if (from === PhaseStatus.active && to === PhaseStatus.complete) return true;
  return false;
}

export const updatePhaseStatus = action(
  "updatePhaseStatus",
  async (phaseId: string, status: PhaseStatus) => {
    const orgId = await requireOrgId();
    const phase = await db.campaignPhase.findFirst({
      where: { id: phaseId, campaign: { organizationId: orgId } },
      include: { campaign: true },
    });

    if (!phase) {
      throw new Error("Phase not found");
    }

    if (!isLegalTransition(phase.status, status)) {
      throw new Error(
        `Illegal phase transition: ${phase.status} → ${status}`
      );
    }

    // H-8: wrap all writes in $transaction so a crash mid-flight can't
    // leave the campaign in a partially-advanced state (phase complete,
    // next phase still pending, currentPhase stale).
    const writes: Prisma.PrismaPromise<unknown>[] = [
      db.campaignPhase.update({
        where: { id: phaseId },
        data: { status },
      }),
    ];

    if (status === PhaseStatus.complete) {
      const nextPhase = await db.campaignPhase.findFirst({
        where: {
          campaignId: phase.campaignId,
          order: { gt: phase.order },
        },
        orderBy: { order: "asc" },
      });

      if (nextPhase) {
        writes.push(
          db.campaignPhase.update({
            where: { id: nextPhase.id },
            data: { status: PhaseStatus.active },
          }),
          db.campaign.update({
            where: { id: phase.campaignId },
            data: { currentPhase: nextPhase.name },
          })
        );
      } else {
        writes.push(
          db.campaign.update({
            where: { id: phase.campaignId },
            data: { status: CampaignStatus.complete },
          })
        );
      }
    }

    await db.$transaction(writes);

    return {
      revalidate: ["/campaigns", `/campaigns/${phase.campaignId}`],
      revalidateTags: [`campaign:${phase.campaignId}`, `stats:${orgId}`],
    };
  }
);

export const revertToPhase = action("revertToPhase", async (phaseId: string) => {
  const orgId = await requireOrgId();
  const phase = await db.campaignPhase.findFirst({
    where: { id: phaseId, campaign: { organizationId: orgId } },
  });
  if (!phase) throw new Error("Phase not found");

  // Set this phase to active, all phases with higher order to pending
  await db.$transaction([
    db.campaignPhase.update({
      where: { id: phaseId },
      data: { status: PhaseStatus.active },
    }),
    db.campaignPhase.updateMany({
      where: {
        campaignId: phase.campaignId,
        order: { gt: phase.order },
      },
      data: { status: PhaseStatus.pending },
    }),
    db.campaign.update({
      where: { id: phase.campaignId },
      data: { currentPhase: phase.name, status: CampaignStatus.active },
    }),
  ]);

  return {
    revalidate: ["/campaigns", `/campaigns/${phase.campaignId}`],
    revalidateTags: [`campaign:${phase.campaignId}`, `stats:${orgId}`],
  };
});
