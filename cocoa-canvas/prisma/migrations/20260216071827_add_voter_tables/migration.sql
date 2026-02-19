-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "passwordHash" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastLogin" TIMESTAMP,
    "loginAttempts" INTEGER NOT NULL DEFAULT 0,
    "lockedUntil" TIMESTAMP,
    "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP NOT NULL,
    CONSTRAINT "User_email_key" UNIQUE ("email")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Session_token_key" UNIQUE ("token")
);

-- CreateTable
CREATE TABLE "Campaign" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "startDate" TIMESTAMP NOT NULL,
    "endDate" TIMESTAMP NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'planning',
    "targetArea" TEXT,
    "color" TEXT NOT NULL DEFAULT '#6B4423',
    "logoUrl" TEXT,
    "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP NOT NULL,
    CONSTRAINT "Campaign_id_key" UNIQUE ("id")
);

-- CreateTable
CREATE TABLE "Job" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "totalItems" INTEGER NOT NULL DEFAULT 0,
    "processedItems" INTEGER NOT NULL DEFAULT 0,
    "errorLog" TEXT,
    "data" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" TIMESTAMP,
    "completedAt" TIMESTAMP,
    CONSTRAINT "Job_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "resource" TEXT,
    "resourceId" TEXT,
    "details" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Voter" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT,
    "phone" TEXT,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "notes" TEXT,
    "contactStatus" TEXT NOT NULL DEFAULT 'pending',
    "lastContactDate" TIMESTAMP,
    "lastContactMethod" TEXT,
    "importedFrom" TEXT,
    "registrationDate" TIMESTAMP,
    "votingPreference" TEXT,
    "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP NOT NULL
);

-- CreateTable
CREATE TABLE "CampaignVoter" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "campaignId" TEXT NOT NULL,
    "voterId" TEXT NOT NULL,
    "assigned" BOOLEAN NOT NULL DEFAULT true,
    "assignedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP NOT NULL,
    CONSTRAINT "CampaignVoter_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CampaignVoter_voterId_fkey" FOREIGN KEY ("voterId") REFERENCES "Voter" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ContactLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "voterId" TEXT NOT NULL,
    "contactType" TEXT NOT NULL,
    "outcome" TEXT,
    "notes" TEXT,
    "followUpNeeded" BOOLEAN NOT NULL DEFAULT false,
    "followUpDate" TIMESTAMP,
    "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP NOT NULL,
    CONSTRAINT "ContactLog_voterId_fkey" FOREIGN KEY ("voterId") REFERENCES "Voter" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Setting" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updatedAt" TIMESTAMP NOT NULL,
    "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Setting_key_key" UNIQUE ("key")
);

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE INDEX "Session_expiresAt_idx" ON "Session"("expiresAt");

-- CreateIndex
CREATE INDEX "Job_status_idx" ON "Job"("status");

-- CreateIndex
CREATE INDEX "Job_type_idx" ON "Job"("type");

-- CreateIndex
CREATE INDEX "Job_createdAt_idx" ON "Job"("createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_userId_idx" ON "AuditLog"("userId");

-- CreateIndex
CREATE INDEX "AuditLog_action_idx" ON "AuditLog"("action");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Voter_email_key" ON "Voter"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Voter_phone_key" ON "Voter"("phone");

-- CreateIndex
CREATE INDEX "Voter_email_idx" ON "Voter"("email");

-- CreateIndex
CREATE INDEX "Voter_phone_idx" ON "Voter"("phone");

-- CreateIndex
CREATE INDEX "Voter_contactStatus_idx" ON "Voter"("contactStatus");

-- CreateIndex
CREATE INDEX "Voter_createdAt_idx" ON "Voter"("createdAt");

-- CreateIndex
CREATE INDEX "CampaignVoter_campaignId_idx" ON "CampaignVoter"("campaignId");

-- CreateIndex
CREATE INDEX "CampaignVoter_voterId_idx" ON "CampaignVoter"("voterId");

-- CreateIndex
CREATE UNIQUE INDEX "CampaignVoter_campaignId_voterId_key" ON "CampaignVoter"("campaignId", "voterId");

-- CreateIndex
CREATE INDEX "ContactLog_voterId_idx" ON "ContactLog"("voterId");

-- CreateIndex
CREATE INDEX "ContactLog_contactType_idx" ON "ContactLog"("contactType");

-- CreateIndex
CREATE INDEX "ContactLog_createdAt_idx" ON "ContactLog"("createdAt");
