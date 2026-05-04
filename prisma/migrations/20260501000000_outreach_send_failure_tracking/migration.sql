-- H-5: per-outreach send-failure tracking + terminal `failed` state.
-- A permanent error (suppressed address, malformed body, hard bounce) used
-- to release the claim and re-enter the queue every cron tick forever.
-- We now count failures, store the last error, and transition to a
-- terminal `failed` status at N=3.

-- 1. Extend the OutreachStatus enum.
ALTER TYPE "OutreachStatus" ADD VALUE IF NOT EXISTS 'failed';

-- 2. New columns on Outreach.
ALTER TABLE "Outreach"
  ADD COLUMN "sendFailureCount" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "lastSendError" TEXT,
  ADD COLUMN "lastSendAttemptAt" TIMESTAMP(3);
