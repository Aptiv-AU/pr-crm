-- CreateTable
CREATE TABLE "ContactTag" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "colorBg" TEXT NOT NULL DEFAULT '#374151',
    "colorFg" TEXT NOT NULL DEFAULT '#ffffff',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContactTag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContactTagAssignment" (
    "id" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContactTagAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContactSegment" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "filter" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContactSegment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ContactTag_organizationId_label_key" ON "ContactTag"("organizationId", "label");

-- CreateIndex
CREATE INDEX "ContactTagAssignment_tagId_idx" ON "ContactTagAssignment"("tagId");

-- CreateIndex
CREATE UNIQUE INDEX "ContactTagAssignment_contactId_tagId_key" ON "ContactTagAssignment"("contactId", "tagId");

-- CreateIndex
CREATE UNIQUE INDEX "ContactSegment_organizationId_name_key" ON "ContactSegment"("organizationId", "name");

-- AddForeignKey
ALTER TABLE "ContactTag" ADD CONSTRAINT "ContactTag_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContactTagAssignment" ADD CONSTRAINT "ContactTagAssignment_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContactTagAssignment" ADD CONSTRAINT "ContactTagAssignment_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "ContactTag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContactSegment" ADD CONSTRAINT "ContactSegment_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
