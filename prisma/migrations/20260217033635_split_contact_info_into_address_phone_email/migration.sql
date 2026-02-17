/*
  Warnings:

  - You are about to drop the `ContactInfo` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "ContactInfo";
PRAGMA foreign_keys=on;

-- CreateTable
CREATE TABLE "Address" (
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
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "isCurrently" BOOLEAN NOT NULL DEFAULT true,
    "source" TEXT,
    "verifiedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Address_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Address_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Phone" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "personId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "isCurrently" BOOLEAN NOT NULL DEFAULT true,
    "violationCount" INTEGER NOT NULL DEFAULT 0,
    "canText" BOOLEAN NOT NULL DEFAULT false,
    "hasConsent" BOOLEAN NOT NULL DEFAULT false,
    "doNotCall" BOOLEAN NOT NULL DEFAULT false,
    "source" TEXT,
    "verifiedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Phone_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Phone_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Email" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "personId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "isCurrently" BOOLEAN NOT NULL DEFAULT true,
    "bounceCount" INTEGER NOT NULL DEFAULT 0,
    "hasConsent" BOOLEAN NOT NULL DEFAULT false,
    "unsubscribed" BOOLEAN NOT NULL DEFAULT false,
    "source" TEXT,
    "verifiedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Email_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Email_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "Address_personId_idx" ON "Address"("personId");

-- CreateIndex
CREATE INDEX "Address_locationId_idx" ON "Address"("locationId");

-- CreateIndex
CREATE INDEX "Address_isPrimary_idx" ON "Address"("isPrimary");

-- CreateIndex
CREATE INDEX "Address_isCurrently_idx" ON "Address"("isCurrently");

-- CreateIndex
CREATE UNIQUE INDEX "Address_personId_locationId_key" ON "Address"("personId", "locationId");

-- CreateIndex
CREATE INDEX "Phone_personId_idx" ON "Phone"("personId");

-- CreateIndex
CREATE INDEX "Phone_locationId_idx" ON "Phone"("locationId");

-- CreateIndex
CREATE INDEX "Phone_number_idx" ON "Phone"("number");

-- CreateIndex
CREATE INDEX "Phone_isPrimary_idx" ON "Phone"("isPrimary");

-- CreateIndex
CREATE INDEX "Phone_isCurrently_idx" ON "Phone"("isCurrently");

-- CreateIndex
CREATE UNIQUE INDEX "Phone_personId_locationId_key" ON "Phone"("personId", "locationId");

-- CreateIndex
CREATE INDEX "Email_personId_idx" ON "Email"("personId");

-- CreateIndex
CREATE INDEX "Email_locationId_idx" ON "Email"("locationId");

-- CreateIndex
CREATE INDEX "Email_address_idx" ON "Email"("address");

-- CreateIndex
CREATE INDEX "Email_isPrimary_idx" ON "Email"("isPrimary");

-- CreateIndex
CREATE INDEX "Email_isCurrently_idx" ON "Email"("isCurrently");

-- CreateIndex
CREATE UNIQUE INDEX "Email_personId_locationId_key" ON "Email"("personId", "locationId");
