-- Convert Outreach.status from String to OutreachStatus enum
CREATE TYPE "OutreachStatus" AS ENUM ('draft', 'approved', 'sent', 'replied');

ALTER TABLE "Outreach" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Outreach" ALTER COLUMN "status" TYPE "OutreachStatus" USING ("status"::"OutreachStatus");
ALTER TABLE "Outreach" ALTER COLUMN "status" SET DEFAULT 'draft'::"OutreachStatus";
