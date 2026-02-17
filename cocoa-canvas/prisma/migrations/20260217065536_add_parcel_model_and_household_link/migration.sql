-- CreateTable
CREATE TABLE "Parcel" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "streetNumber" TEXT,
    "preDirection" TEXT,
    "streetName" TEXT NOT NULL,
    "streetSuffix" TEXT,
    "postDirection" TEXT,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL DEFAULT 'CA',
    "zipCode" TEXT NOT NULL,
    "fullAddress" TEXT,
    "geometry" TEXT,
    "centroidLatitude" REAL,
    "centroidLongitude" REAL,
    "apn" TEXT,
    "externalId" TEXT,
    "externalSource" TEXT,
    "importedFrom" TEXT,
    "importedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Household" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "buildingId" TEXT,
    "parcelId" TEXT,
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
    CONSTRAINT "Household_buildingId_fkey" FOREIGN KEY ("buildingId") REFERENCES "Building" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Household_parcelId_fkey" FOREIGN KEY ("parcelId") REFERENCES "Parcel" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Household" ("buildingId", "city", "createdAt", "fullAddress", "geocoded", "geocodedAt", "houseNumber", "id", "latitude", "longitude", "maxVotingScore", "personCount", "postDirection", "preDirection", "state", "streetName", "streetSuffix", "unitAbbr", "unitNumber", "updatedAt", "zipCode") SELECT "buildingId", "city", "createdAt", "fullAddress", "geocoded", "geocodedAt", "houseNumber", "id", "latitude", "longitude", "maxVotingScore", "personCount", "postDirection", "preDirection", "state", "streetName", "streetSuffix", "unitAbbr", "unitNumber", "updatedAt", "zipCode" FROM "Household";
DROP TABLE "Household";
ALTER TABLE "new_Household" RENAME TO "Household";
CREATE UNIQUE INDEX "Household_fullAddress_key" ON "Household"("fullAddress");
CREATE INDEX "Household_buildingId_idx" ON "Household"("buildingId");
CREATE INDEX "Household_parcelId_idx" ON "Household"("parcelId");
CREATE INDEX "Household_city_idx" ON "Household"("city");
CREATE INDEX "Household_fullAddress_idx" ON "Household"("fullAddress");
CREATE INDEX "Household_zipCode_idx" ON "Household"("zipCode");
CREATE UNIQUE INDEX "Household_houseNumber_streetName_zipCode_key" ON "Household"("houseNumber", "streetName", "zipCode");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "Parcel_fullAddress_idx" ON "Parcel"("fullAddress");

-- CreateIndex
CREATE INDEX "Parcel_zipCode_idx" ON "Parcel"("zipCode");

-- CreateIndex
CREATE INDEX "Parcel_city_idx" ON "Parcel"("city");

-- CreateIndex
CREATE UNIQUE INDEX "Parcel_apn_externalSource_key" ON "Parcel"("apn", "externalSource");
