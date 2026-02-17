/*
  Warnings:

  - You are about to drop the `CampaignVoter` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropIndex
DROP INDEX "CampaignVoter_campaignId_voterId_key";

-- DropIndex
DROP INDEX "CampaignVoter_voterId_idx";

-- DropIndex
DROP INDEX "CampaignVoter_campaignId_idx";

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "CampaignVoter";
PRAGMA foreign_keys=on;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Campaign" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "startDate" DATETIME NOT NULL,
    "endDate" DATETIME NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'planning',
    "targetArea" TEXT,
    "color" TEXT NOT NULL DEFAULT '#6B4423',
    "logoUrl" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Campaign" ("createdAt", "description", "endDate", "id", "name", "startDate", "status", "targetArea", "updatedAt") SELECT "createdAt", "description", "endDate", "id", "name", "startDate", "status", "targetArea", "updatedAt" FROM "Campaign";
DROP TABLE "Campaign";
ALTER TABLE "new_Campaign" RENAME TO "Campaign";
CREATE UNIQUE INDEX "Campaign_id_key" ON "Campaign"("id");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
