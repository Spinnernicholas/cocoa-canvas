-- CreateTable
CREATE TABLE "GeocoderProvider" (
    "id" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "providerName" TEXT NOT NULL,
    "description" TEXT,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "config" TEXT,
    "requestsProcessed" INTEGER NOT NULL DEFAULT 0,
    "requestsFailed" INTEGER NOT NULL DEFAULT 0,
    "lastUsedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GeocoderProvider_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GeocoderProvider_providerId_key" ON "GeocoderProvider"("providerId");

-- CreateIndex
CREATE INDEX "GeocoderProvider_providerId_idx" ON "GeocoderProvider"("providerId");

-- CreateIndex
CREATE INDEX "GeocoderProvider_isEnabled_idx" ON "GeocoderProvider"("isEnabled");

-- CreateIndex
CREATE INDEX "GeocoderProvider_isPrimary_idx" ON "GeocoderProvider"("isPrimary");
