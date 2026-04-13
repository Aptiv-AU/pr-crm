-- AlterTable
ALTER TABLE "Outreach" ADD COLUMN     "conversationId" TEXT,
ADD COLUMN     "followUpNumber" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "messageId" TEXT,
ADD COLUMN     "scheduledAt" TIMESTAMP(3),
ADD COLUMN     "sentVia" TEXT;
