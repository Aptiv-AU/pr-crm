-- Convert Campaign.status from String to CampaignStatus enum
CREATE TYPE "CampaignStatus" AS ENUM ('draft', 'active', 'complete');

ALTER TABLE "Campaign" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Campaign" ALTER COLUMN "status" TYPE "CampaignStatus" USING ("status"::"CampaignStatus");
ALTER TABLE "Campaign" ALTER COLUMN "status" SET DEFAULT 'draft'::"CampaignStatus";
