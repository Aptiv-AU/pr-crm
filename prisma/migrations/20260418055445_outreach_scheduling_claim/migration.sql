-- AlterTable
ALTER TABLE "Outreach" ADD COLUMN     "claimedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "Outreach_status_scheduledAt_claimedAt_idx" ON "Outreach"("status", "scheduledAt", "claimedAt");

-- CreateIndex
CREATE INDEX "Outreach_threadId_idx" ON "Outreach"("threadId");
