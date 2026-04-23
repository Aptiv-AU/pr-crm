-- AlterTable
ALTER TABLE "Organization" ADD COLUMN     "locale" TEXT NOT NULL DEFAULT 'en-AU',
ADD COLUMN     "timezone" TEXT NOT NULL DEFAULT 'Australia/Sydney';
