/*
  Warnings:

  - You are about to drop the column `voterId` on the `ContactInfo` table. All the data in the column will be lost.
  - You are about to drop the column `contactType` on the `ContactLog` table. All the data in the column will be lost.
  - You are about to drop the column `voterId` on the `ContactLog` table. All the data in the column will be lost.
  - You are about to drop the column `ballotCounted` on the `VoteHistory` table. All the data in the column will be lost.
  - You are about to drop the column `ballotPartyAbbr` on the `VoteHistory` table. All the data in the column will be lost.
  - You are about to drop the column `subDistrict` on the `VoteHistory` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `VoteHistory` table. All the data in the column will be lost.
  - You are about to drop the column `birthDate` on the `Voter` table. All the data in the column will be lost.
  - You are about to drop the column `birthPlace` on the `Voter` table. All the data in the column will be lost.
  - You are about to drop the column `firstName` on the `Voter` table. All the data in the column will be lost.
  - You are about to drop the column `gender` on the `Voter` table. All the data in the column will be lost.
  - You are about to drop the column `language` on the `Voter` table. All the data in the column will be lost.
  - You are about to drop the column `lastName` on the `Voter` table. All the data in the column will be lost.
  - You are about to drop the column `middleName` on the `Voter` table. All the data in the column will be lost.
  - You are about to drop the column `nameSuffix` on the `Voter` table. All the data in the column will be lost.
  - You are about to drop the column `notes` on the `Voter` table. All the data in the column will be lost.
  - You are about to drop the column `partyAbbr` on the `Voter` table. All the data in the column will be lost.
  - You are about to drop the column `partyName` on the `Voter` table. All the data in the column will be lost.
  - You are about to drop the column `precinctName` on the `Voter` table. All the data in the column will be lost.
  - You are about to drop the column `voterFileId` on the `Voter` table. All the data in the column will be lost.
  - Added the required column `personId` to the `ContactInfo` table without a default value. This is not possible if the table is not empty.
  - Added the required column `method` to the `ContactLog` table without a default value. This is not possible if the table is not empty.
  - Added the required column `personId` to the `ContactLog` table without a default value. This is not possible if the table is not empty.
  - Added the required column `participated` to the `VoteHistory` table without a default value. This is not possible if the table is not empty.
  - Added the required column `personId` to the `Voter` table without a default value. This is not possible if the table is not empty.

*/
-- CreateTable
CREATE TABLE "Party" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "abbr" TEXT NOT NULL,
    "description" TEXT,
    "color" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Precinct" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "number" TEXT NOT NULL,
    "name" TEXT,
    "description" TEXT,
    "pollingPlace" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Election" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "electionDate" DATETIME NOT NULL,
    "electionAbbr" TEXT,
    "electionDesc" TEXT,
    "electionType" TEXT,
    "jurisdictionCode" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Building" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "streetNumber" TEXT NOT NULL,
    "preDirection" TEXT,
    "streetName" TEXT NOT NULL,
    "streetSuffix" TEXT,
    "postDirection" TEXT,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL DEFAULT 'CA',
    "zipCode" TEXT NOT NULL,
    "fullAddress" TEXT NOT NULL,
    "buildingType" TEXT,
    "totalUnits" INTEGER,
    "latitude" REAL,
    "longitude" REAL,
    "geocoded" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Household" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "buildingId" TEXT,
    "houseNumber" TEXT,
    "preDirection" TEXT,
    "streetName" TEXT NOT NULL,
    "streetSuffix" TEXT,
    "postDirection" TEXT,
    "unitAbbr" TEXT,
    "unitNumber" TEXT,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL DEFAULT 'CA',
    "zipCode" TEXT NOT NULL,
    "fullAddress" TEXT NOT NULL,
    "personCount" INTEGER NOT NULL DEFAULT 0,
    "maxVotingScore" INTEGER,
    "latitude" REAL,
    "longitude" REAL,
    "geocoded" BOOLEAN NOT NULL DEFAULT false,
    "geocodedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Household_buildingId_fkey" FOREIGN KEY ("buildingId") REFERENCES "Building" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Person" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT,
    "firstName" TEXT NOT NULL,
    "middleName" TEXT,
    "lastName" TEXT NOT NULL,
    "nameSuffix" TEXT,
    "gender" TEXT,
    "birthDate" DATETIME,
    "birthPlace" TEXT,
    "language" TEXT,
    "householdId" TEXT,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Person_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Volunteer" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "personId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "skills" TEXT,
    "availability" TEXT,
    "hoursCommitted" INTEGER,
    "hoursCompleted" INTEGER NOT NULL DEFAULT 0,
    "currentAssignment" TEXT,
    "teamId" TEXT,
    "preferredContactMethod" TEXT,
    "canDrive" BOOLEAN NOT NULL DEFAULT false,
    "hasOwnEquipment" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Volunteer_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Donor" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "personId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "totalContributed" REAL NOT NULL DEFAULT 0,
    "lastContributionDate" DATETIME,
    "lastContributionAmount" REAL,
    "donorTier" TEXT,
    "recurringAmount" REAL,
    "preferredAskAmount" REAL,
    "doNotContact" BOOLEAN NOT NULL DEFAULT false,
    "anonymousGiving" BOOLEAN NOT NULL DEFAULT false,
    "recognitionName" TEXT,
    "acknowledgeInPublic" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Donor_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ContactInfo" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "personId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "houseNumber" TEXT,
    "preDirection" TEXT,
    "streetName" TEXT,
    "streetSuffix" TEXT,
    "postDirection" TEXT,
    "unitAbbr" TEXT,
    "unitNumber" TEXT,
    "city" TEXT,
    "state" TEXT DEFAULT 'CA',
    "zipCode" TEXT,
    "fullAddress" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "isCurrently" BOOLEAN NOT NULL DEFAULT true,
    "source" TEXT,
    "verifiedAt" DATETIME,
    "violationCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ContactInfo_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ContactInfo_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_ContactInfo" ("city", "createdAt", "email", "fullAddress", "houseNumber", "id", "isPrimary", "isVerified", "locationId", "phone", "postDirection", "preDirection", "state", "streetName", "streetSuffix", "unitAbbr", "unitNumber", "updatedAt", "zipCode") SELECT "city", "createdAt", "email", "fullAddress", "houseNumber", "id", "isPrimary", "isVerified", "locationId", "phone", "postDirection", "preDirection", "state", "streetName", "streetSuffix", "unitAbbr", "unitNumber", "updatedAt", "zipCode" FROM "ContactInfo";
DROP TABLE "ContactInfo";
ALTER TABLE "new_ContactInfo" RENAME TO "ContactInfo";
CREATE INDEX "ContactInfo_personId_idx" ON "ContactInfo"("personId");
CREATE INDEX "ContactInfo_locationId_idx" ON "ContactInfo"("locationId");
CREATE INDEX "ContactInfo_phone_idx" ON "ContactInfo"("phone");
CREATE INDEX "ContactInfo_email_idx" ON "ContactInfo"("email");
CREATE INDEX "ContactInfo_isPrimary_idx" ON "ContactInfo"("isPrimary");
CREATE INDEX "ContactInfo_isCurrently_idx" ON "ContactInfo"("isCurrently");
CREATE UNIQUE INDEX "ContactInfo_personId_locationId_key" ON "ContactInfo"("personId", "locationId");
CREATE TABLE "new_ContactLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "personId" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "outcome" TEXT,
    "notes" TEXT,
    "followUpNeeded" BOOLEAN NOT NULL DEFAULT false,
    "followUpDate" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ContactLog_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_ContactLog" ("createdAt", "followUpDate", "followUpNeeded", "id", "notes", "outcome", "updatedAt") SELECT "createdAt", "followUpDate", "followUpNeeded", "id", "notes", "outcome", "updatedAt" FROM "ContactLog";
DROP TABLE "ContactLog";
ALTER TABLE "new_ContactLog" RENAME TO "ContactLog";
CREATE INDEX "ContactLog_personId_idx" ON "ContactLog"("personId");
CREATE INDEX "ContactLog_method_idx" ON "ContactLog"("method");
CREATE INDEX "ContactLog_outcome_idx" ON "ContactLog"("outcome");
CREATE INDEX "ContactLog_createdAt_idx" ON "ContactLog"("createdAt");
CREATE TABLE "new_Location" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "category" TEXT,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Location" ("createdAt", "description", "id", "name", "updatedAt") SELECT "createdAt", "description", "id", "name", "updatedAt" FROM "Location";
DROP TABLE "Location";
ALTER TABLE "new_Location" RENAME TO "Location";
CREATE UNIQUE INDEX "Location_name_key" ON "Location"("name");
CREATE INDEX "Location_name_idx" ON "Location"("name");
CREATE INDEX "Location_category_idx" ON "Location"("category");
CREATE TABLE "new_VoteHistory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "voterId" TEXT NOT NULL,
    "electionId" TEXT,
    "ballotPartyId" TEXT,
    "electionDate" DATETIME,
    "electionAbbr" TEXT,
    "electionDesc" TEXT,
    "electionType" TEXT,
    "participated" BOOLEAN NOT NULL,
    "votingMethod" TEXT,
    "ballotPartyName" TEXT,
    "districtId" TEXT,
    "districtName" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "VoteHistory_voterId_fkey" FOREIGN KEY ("voterId") REFERENCES "Voter" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "VoteHistory_electionId_fkey" FOREIGN KEY ("electionId") REFERENCES "Election" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "VoteHistory_ballotPartyId_fkey" FOREIGN KEY ("ballotPartyId") REFERENCES "Party" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_VoteHistory" ("ballotPartyName", "createdAt", "districtId", "districtName", "electionAbbr", "electionDate", "electionDesc", "electionType", "id", "voterId", "votingMethod") SELECT "ballotPartyName", "createdAt", "districtId", "districtName", "electionAbbr", "electionDate", "electionDesc", "electionType", "id", "voterId", "votingMethod" FROM "VoteHistory";
DROP TABLE "VoteHistory";
ALTER TABLE "new_VoteHistory" RENAME TO "VoteHistory";
CREATE INDEX "VoteHistory_voterId_idx" ON "VoteHistory"("voterId");
CREATE INDEX "VoteHistory_electionDate_idx" ON "VoteHistory"("electionDate");
CREATE INDEX "VoteHistory_participated_idx" ON "VoteHistory"("participated");
CREATE INDEX "VoteHistory_votingMethod_idx" ON "VoteHistory"("votingMethod");
CREATE UNIQUE INDEX "VoteHistory_voterId_electionDate_key" ON "VoteHistory"("voterId", "electionDate");
CREATE TABLE "new_Voter" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "personId" TEXT NOT NULL,
    "externalId" TEXT,
    "externalSource" TEXT,
    "registrationNumber" TEXT,
    "title" TEXT,
    "registrationDate" DATETIME,
    "partyId" TEXT,
    "vbmStatus" TEXT,
    "precinctId" TEXT,
    "precinctPortion" TEXT,
    "contactStatus" TEXT NOT NULL DEFAULT 'pending',
    "lastContactDate" DATETIME,
    "lastContactMethod" TEXT,
    "importedFrom" TEXT,
    "importType" TEXT,
    "importFormat" TEXT,
    "importFile" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Voter_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Voter_partyId_fkey" FOREIGN KEY ("partyId") REFERENCES "Party" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Voter_precinctId_fkey" FOREIGN KEY ("precinctId") REFERENCES "Precinct" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Voter" ("contactStatus", "createdAt", "id", "importFormat", "importType", "importedFrom", "lastContactDate", "lastContactMethod", "precinctId", "precinctPortion", "registrationDate", "registrationNumber", "title", "updatedAt", "vbmStatus") SELECT "contactStatus", "createdAt", "id", "importFormat", "importType", "importedFrom", "lastContactDate", "lastContactMethod", "precinctId", "precinctPortion", "registrationDate", "registrationNumber", "title", "updatedAt", "vbmStatus" FROM "Voter";
DROP TABLE "Voter";
ALTER TABLE "new_Voter" RENAME TO "Voter";
CREATE UNIQUE INDEX "Voter_personId_key" ON "Voter"("personId");
CREATE INDEX "Voter_externalId_idx" ON "Voter"("externalId");
CREATE INDEX "Voter_registrationNumber_idx" ON "Voter"("registrationNumber");
CREATE INDEX "Voter_precinctId_idx" ON "Voter"("precinctId");
CREATE INDEX "Voter_contactStatus_idx" ON "Voter"("contactStatus");
CREATE UNIQUE INDEX "Voter_externalId_externalSource_key" ON "Voter"("externalId", "externalSource");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "Party_name_key" ON "Party"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Party_abbr_key" ON "Party"("abbr");

-- CreateIndex
CREATE INDEX "Party_abbr_idx" ON "Party"("abbr");

-- CreateIndex
CREATE UNIQUE INDEX "Precinct_number_key" ON "Precinct"("number");

-- CreateIndex
CREATE INDEX "Precinct_number_idx" ON "Precinct"("number");

-- CreateIndex
CREATE UNIQUE INDEX "Election_electionDate_key" ON "Election"("electionDate");

-- CreateIndex
CREATE UNIQUE INDEX "Election_electionAbbr_key" ON "Election"("electionAbbr");

-- CreateIndex
CREATE INDEX "Election_electionDate_idx" ON "Election"("electionDate");

-- CreateIndex
CREATE UNIQUE INDEX "Building_fullAddress_key" ON "Building"("fullAddress");

-- CreateIndex
CREATE INDEX "Building_fullAddress_idx" ON "Building"("fullAddress");

-- CreateIndex
CREATE INDEX "Building_zipCode_idx" ON "Building"("zipCode");

-- CreateIndex
CREATE UNIQUE INDEX "Household_fullAddress_key" ON "Household"("fullAddress");

-- CreateIndex
CREATE INDEX "Household_buildingId_idx" ON "Household"("buildingId");

-- CreateIndex
CREATE INDEX "Household_fullAddress_idx" ON "Household"("fullAddress");

-- CreateIndex
CREATE INDEX "Household_zipCode_idx" ON "Household"("zipCode");

-- CreateIndex
CREATE UNIQUE INDEX "Household_houseNumber_streetName_zipCode_key" ON "Household"("houseNumber", "streetName", "zipCode");

-- CreateIndex
CREATE INDEX "Person_firstName_lastName_idx" ON "Person"("firstName", "lastName");

-- CreateIndex
CREATE INDEX "Person_householdId_idx" ON "Person"("householdId");

-- CreateIndex
CREATE UNIQUE INDEX "Volunteer_personId_key" ON "Volunteer"("personId");

-- CreateIndex
CREATE INDEX "Volunteer_status_idx" ON "Volunteer"("status");

-- CreateIndex
CREATE INDEX "Volunteer_teamId_idx" ON "Volunteer"("teamId");

-- CreateIndex
CREATE UNIQUE INDEX "Donor_personId_key" ON "Donor"("personId");

-- CreateIndex
CREATE INDEX "Donor_status_idx" ON "Donor"("status");

-- CreateIndex
CREATE INDEX "Donor_donorTier_idx" ON "Donor"("donorTier");

-- CreateIndex
CREATE INDEX "Donor_lastContributionDate_idx" ON "Donor"("lastContributionDate");
