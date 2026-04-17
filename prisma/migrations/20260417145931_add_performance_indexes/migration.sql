-- CreateIndex
CREATE INDEX "CampaignContact_contactId_idx" ON "CampaignContact"("contactId");

-- CreateIndex
CREATE INDEX "Contact_organizationId_createdAt_idx" ON "Contact"("organizationId", "createdAt");

-- CreateIndex
CREATE INDEX "Contact_organizationId_beat_idx" ON "Contact"("organizationId", "beat");

-- CreateIndex
CREATE INDEX "Contact_organizationId_tier_idx" ON "Contact"("organizationId", "tier");

-- CreateIndex
CREATE INDEX "Contact_organizationId_outlet_idx" ON "Contact"("organizationId", "outlet");

-- CreateIndex
CREATE INDEX "Contact_organizationId_email_idx" ON "Contact"("organizationId", "email");

-- CreateIndex
CREATE INDEX "Coverage_organizationId_date_idx" ON "Coverage"("organizationId", "date");

-- CreateIndex
CREATE INDEX "Coverage_campaignId_date_idx" ON "Coverage"("campaignId", "date");

-- CreateIndex
CREATE INDEX "Coverage_contactId_idx" ON "Coverage"("contactId");

-- CreateIndex
CREATE INDEX "EmailAccount_userId_idx" ON "EmailAccount"("userId");

-- CreateIndex
CREATE INDEX "Interaction_contactId_date_idx" ON "Interaction"("contactId", "date");

-- CreateIndex
CREATE INDEX "Interaction_organizationId_date_idx" ON "Interaction"("organizationId", "date");

-- CreateIndex
CREATE INDEX "Outreach_campaignId_status_idx" ON "Outreach"("campaignId", "status");

-- CreateIndex
CREATE INDEX "Outreach_campaignId_contactId_followUpNumber_idx" ON "Outreach"("campaignId", "contactId", "followUpNumber");

-- CreateIndex (partial; not expressible in Prisma schema)
CREATE INDEX "Outreach_status_sentAt_partial_idx" ON "Outreach"("status", "sentAt") WHERE "conversationId" IS NOT NULL;
