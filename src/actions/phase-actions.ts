"use server";

import { db } from "@/lib/db";
import { CampaignStatus, PhaseStatus } from "@prisma/client";
import { action } from "@/lib/server/action";
import { requireOrgId } from "@/lib/server/org";

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

    await db.campaignPhase.update({
      where: { id: phaseId },
      data: { status },
    });

    if (status === PhaseStatus.complete) {
      const nextPhase = await db.campaignPhase.findFirst({
        where: {
          campaignId: phase.campaignId,
          order: { gt: phase.order },
        },
        orderBy: { order: "asc" },
      });

      if (nextPhase) {
        await db.campaignPhase.update({
          where: { id: nextPhase.id },
          data: { status: PhaseStatus.active },
        });

        await db.campaign.update({
          where: { id: phase.campaignId },
          data: { currentPhase: nextPhase.name },
        });
      } else {
        await db.campaign.update({
          where: { id: phase.campaignId },
          data: { status: CampaignStatus.complete },
        });
      }
    }

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
