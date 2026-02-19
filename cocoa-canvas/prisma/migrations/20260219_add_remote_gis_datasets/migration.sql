-- CreateTable
CREATE TABLE "remote_gis_datasets" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "serviceUrl" TEXT NOT NULL,
    "layerId" INTEGER NOT NULL,
    "layerName" TEXT NOT NULL,
    "layerType" TEXT,
    "geometryType" TEXT,
    "serviceType" TEXT,
    "serviceTitle" TEXT,
    "layerDescription" TEXT,
    "fields" JSONB,
    "spatialReference" JSONB,
    "srid" INTEGER,
    "extent" JSONB,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastValidatedAt" TIMESTAMP(3),
    "isAccessible" BOOLEAN NOT NULL DEFAULT true,
    "importedDatasetId" TEXT UNIQUE,
    "discoveredBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT,
    CONSTRAINT "remote_gis_datasets_importedDatasetId_fkey" FOREIGN KEY ("importedDatasetId") REFERENCES "gis_datasets" ("id") ON DELETE SET NULL,
    CONSTRAINT "remote_gis_datasets_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE SET NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "remote_gis_datasets_serviceUrl_layerId_key" ON "remote_gis_datasets"("serviceUrl", "layerId");

-- CreateIndex
CREATE INDEX "remote_gis_datasets_importedDatasetId_idx" ON "remote_gis_datasets"("importedDatasetId");

-- CreateIndex
CREATE INDEX "remote_gis_datasets_isAccessible_idx" ON "remote_gis_datasets"("isAccessible");

-- CreateIndex
CREATE INDEX "remote_gis_datasets_createdAt_idx" ON "remote_gis_datasets"("createdAt");

-- AddColumn to gis_datasets
ALTER TABLE "gis_datasets" ADD COLUMN "sourceRemoteDatasetId" TEXT UNIQUE REFERENCES "remote_gis_datasets"("id") ON DELETE SET NULL;

-- AddColumn to User
ALTER TABLE "User" ADD COLUMN "remoteDatasets" TEXT;
