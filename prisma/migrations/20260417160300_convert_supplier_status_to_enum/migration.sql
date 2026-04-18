-- Convert CampaignSupplier.status from String to SupplierStatus enum
CREATE TYPE "SupplierStatus" AS ENUM ('pending', 'confirmed', 'cancelled');

ALTER TABLE "CampaignSupplier" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "CampaignSupplier" ALTER COLUMN "status" TYPE "SupplierStatus" USING ("status"::"SupplierStatus");
ALTER TABLE "CampaignSupplier" ALTER COLUMN "status" SET DEFAULT 'pending'::"SupplierStatus";
