-- Rename Outreach.conversationId -> Outreach.threadId (provider-neutral name).
-- Preserves existing data and re-creates the partial index.

ALTER TABLE "Outreach" ADD COLUMN "threadId" TEXT;
UPDATE "Outreach" SET "threadId" = "conversationId";
ALTER TABLE "Outreach" DROP COLUMN "conversationId";

-- Re-create the partial index that referenced conversationId
DROP INDEX IF EXISTS "Outreach_status_sentAt_partial_idx";
CREATE INDEX "Outreach_status_sentAt_partial_idx" ON "Outreach"("status", "sentAt") WHERE "threadId" IS NOT NULL;
