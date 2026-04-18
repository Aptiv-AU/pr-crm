-- CreateEnum
CREATE TYPE "SignatureSource" AS ENUM ('api', 'scraped', 'manual', 'default');

-- AlterTable
ALTER TABLE "EmailAccount" ADD COLUMN     "fontFamily" TEXT,
ADD COLUMN     "fontSize" TEXT,
ADD COLUMN     "signatureHtml" TEXT,
ADD COLUMN     "signatureSource" "SignatureSource",
ADD COLUMN     "styleResolvedAt" TIMESTAMP(3);
