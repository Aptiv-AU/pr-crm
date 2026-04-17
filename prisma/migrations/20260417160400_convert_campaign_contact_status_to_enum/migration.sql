-- Convert CampaignContact.status from String to CampaignContactStatus enum
CREATE TYPE "CampaignContactStatus" AS ENUM ('added', 'confirmed', 'declined', 'attended');

ALTER TABLE "CampaignContact" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "CampaignContact" ALTER COLUMN "status" TYPE "CampaignContactStatus" USING ("status"::"CampaignContactStatus");
ALTER TABLE "CampaignContact" ALTER COLUMN "status" SET DEFAULT 'added'::"CampaignContactStatus";
