-- CreateTable
CREATE TABLE "Reply" (
    "id" TEXT NOT NULL,
    "outreachId" TEXT NOT NULL,
    "providerMessageId" TEXT NOT NULL,
    "fromEmail" TEXT NOT NULL,
    "fromName" TEXT,
    "receivedAt" TIMESTAMP(3) NOT NULL,
    "subject" TEXT,
    "bodyText" TEXT NOT NULL,
    "bodyHtml" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Reply_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Reply_outreachId_idx" ON "Reply"("outreachId");

-- CreateIndex
CREATE UNIQUE INDEX "Reply_outreachId_providerMessageId_key" ON "Reply"("outreachId", "providerMessageId");

-- AddForeignKey
ALTER TABLE "Reply" ADD CONSTRAINT "Reply_outreachId_fkey" FOREIGN KEY ("outreachId") REFERENCES "Outreach"("id") ON DELETE CASCADE ON UPDATE CASCADE;
