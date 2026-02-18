-- Add geocodingProvider field to track which service was used for geocoding
ALTER TABLE "Household" ADD COLUMN "geocodingProvider" TEXT;
