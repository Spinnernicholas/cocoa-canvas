/*
  Warnings:

  - You are about to drop the column `address` on the `Voter` table. All the data in the column will be lost.
  - You are about to drop the column `email` on the `Voter` table. All the data in the column will be lost.
  - You are about to drop the column `name` on the `Voter` table. All the data in the column will be lost.
  - You are about to drop the column `phone` on the `Voter` table. All the data in the column will be lost.
  - You are about to drop the column `votingPreference` on the `Voter` table. All the data in the column will be lost.
  - Added the required column `firstName` to the `Voter` table without a default value. This is not possible if the table is not empty.
  - Added the required column `lastName` to the `Voter` table without a default value. This is not possible if the table is not empty.

*/
-- CreateTable
CREATE TABLE "Location" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "ContactInfo" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "voterId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "houseNumber" TEXT,
    "preDirection" TEXT,
    "streetName" TEXT,
    "streetSuffix" TEXT,
    "postDirection" TEXT,
    "unitAbbr" TEXT,
    "unitNumber" TEXT,
    "city" TEXT,
    "state" TEXT,
    "zipCode" TEXT,
    "fullAddress" TEXT,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ContactInfo_voterId_fkey" FOREIGN KEY ("voterId") REFERENCES "Voter" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ContactInfo_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "VoteHistory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "voterId" TEXT NOT NULL,
    "electionAbbr" TEXT,
    "electionDesc" TEXT,
    "electionDate" DATETIME,
    "electionType" TEXT,
    "ballotPartyName" TEXT,
    "ballotPartyAbbr" TEXT,
    "ballotCounted" BOOLEAN NOT NULL DEFAULT false,
    "votingMethod" TEXT,
    "districtId" TEXT,
    "subDistrict" TEXT,
    "districtName" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "VoteHistory_voterId_fkey" FOREIGN KEY ("voterId") REFERENCES "Voter" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Voter" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "registrationNumber" TEXT,
    "voterFileId" TEXT,
    "title" TEXT,
    "firstName" TEXT NOT NULL,
    "middleName" TEXT,
    "lastName" TEXT NOT NULL,
    "nameSuffix" TEXT,
    "gender" TEXT,
    "birthDate" DATETIME,
    "birthPlace" TEXT,
    "language" TEXT,
    "registrationDate" DATETIME,
    "partyName" TEXT,
    "partyAbbr" TEXT,
    "vbmStatus" TEXT,
    "precinctId" TEXT,
    "precinctPortion" TEXT,
    "precinctName" TEXT,
    "contactStatus" TEXT NOT NULL DEFAULT 'pending',
    "lastContactDate" DATETIME,
    "lastContactMethod" TEXT,
    "importedFrom" TEXT,
    "importType" TEXT,
    "importFormat" TEXT,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Voter" ("contactStatus", "createdAt", "id", "importedFrom", "lastContactDate", "lastContactMethod", "notes", "registrationDate", "updatedAt") SELECT "contactStatus", "createdAt", "id", "importedFrom", "lastContactDate", "lastContactMethod", "notes", "registrationDate", "updatedAt" FROM "Voter";
DROP TABLE "Voter";
ALTER TABLE "new_Voter" RENAME TO "Voter";
CREATE UNIQUE INDEX "Voter_registrationNumber_key" ON "Voter"("registrationNumber");
CREATE INDEX "Voter_registrationNumber_idx" ON "Voter"("registrationNumber");
CREATE INDEX "Voter_voterFileId_idx" ON "Voter"("voterFileId");
CREATE INDEX "Voter_lastName_firstName_idx" ON "Voter"("lastName", "firstName");
CREATE INDEX "Voter_contactStatus_idx" ON "Voter"("contactStatus");
CREATE INDEX "Voter_precinctId_idx" ON "Voter"("precinctId");
CREATE INDEX "Voter_partyAbbr_idx" ON "Voter"("partyAbbr");
CREATE INDEX "Voter_createdAt_idx" ON "Voter"("createdAt");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "Location_name_key" ON "Location"("name");

-- CreateIndex
CREATE INDEX "Location_name_idx" ON "Location"("name");

-- CreateIndex
CREATE INDEX "ContactInfo_voterId_idx" ON "ContactInfo"("voterId");

-- CreateIndex
CREATE INDEX "ContactInfo_locationId_idx" ON "ContactInfo"("locationId");

-- CreateIndex
CREATE INDEX "ContactInfo_phone_idx" ON "ContactInfo"("phone");

-- CreateIndex
CREATE INDEX "ContactInfo_email_idx" ON "ContactInfo"("email");

-- CreateIndex
CREATE INDEX "ContactInfo_isPrimary_idx" ON "ContactInfo"("isPrimary");

-- CreateIndex
CREATE INDEX "VoteHistory_voterId_idx" ON "VoteHistory"("voterId");

-- CreateIndex
CREATE INDEX "VoteHistory_electionDate_idx" ON "VoteHistory"("electionDate");

-- CreateIndex
CREATE INDEX "VoteHistory_electionType_idx" ON "VoteHistory"("electionType");
