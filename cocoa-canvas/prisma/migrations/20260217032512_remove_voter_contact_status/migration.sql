/*
  Warnings:

  - You are about to drop the column `contactStatus` on the `Voter` table. All the data in the column will be lost.
  - You are about to drop the column `lastContactDate` on the `Voter` table. All the data in the column will be lost.
  - You are about to drop the column `lastContactMethod` on the `Voter` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
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
INSERT INTO "new_Voter" ("createdAt", "externalId", "externalSource", "id", "importFile", "importFormat", "importType", "importedFrom", "partyId", "personId", "precinctId", "precinctPortion", "registrationDate", "registrationNumber", "title", "updatedAt", "vbmStatus") SELECT "createdAt", "externalId", "externalSource", "id", "importFile", "importFormat", "importType", "importedFrom", "partyId", "personId", "precinctId", "precinctPortion", "registrationDate", "registrationNumber", "title", "updatedAt", "vbmStatus" FROM "Voter";
DROP TABLE "Voter";
ALTER TABLE "new_Voter" RENAME TO "Voter";
CREATE UNIQUE INDEX "Voter_personId_key" ON "Voter"("personId");
CREATE INDEX "Voter_externalId_idx" ON "Voter"("externalId");
CREATE INDEX "Voter_registrationNumber_idx" ON "Voter"("registrationNumber");
CREATE INDEX "Voter_precinctId_idx" ON "Voter"("precinctId");
CREATE UNIQUE INDEX "Voter_externalId_externalSource_key" ON "Voter"("externalId", "externalSource");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
