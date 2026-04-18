-- Convert CampaignPhase.status from String to PhaseStatus enum
CREATE TYPE "PhaseStatus" AS ENUM ('pending', 'active', 'complete');

ALTER TABLE "CampaignPhase" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "CampaignPhase" ALTER COLUMN "status" TYPE "PhaseStatus" USING ("status"::"PhaseStatus");
ALTER TABLE "CampaignPhase" ALTER COLUMN "status" SET DEFAULT 'pending'::"PhaseStatus";
