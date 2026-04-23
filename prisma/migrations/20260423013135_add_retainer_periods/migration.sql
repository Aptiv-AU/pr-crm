-- CreateEnum
CREATE TYPE "RetainerCadence" AS ENUM ('weekly', 'fortnightly', 'monthly');

-- CreateTable
CREATE TABLE "RetainerPeriod" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "cadence" "RetainerCadence" NOT NULL,
    "amount" INTEGER NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RetainerPeriod_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RetainerPeriod_clientId_startDate_idx" ON "RetainerPeriod"("clientId", "startDate");

-- AddForeignKey
ALTER TABLE "RetainerPeriod" ADD CONSTRAINT "RetainerPeriod_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;
