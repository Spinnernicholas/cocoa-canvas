-- CreateEnum
CREATE TYPE "GeometryType" AS ENUM ('POINT', 'LINESTRING', 'POLYGON', 'MULTIPOINT', 'MULTILINESTRING', 'MULTIPOLYGON', 'GEOMETRYCOLLECTION');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "passwordHash" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastLogin" TIMESTAMP(3),
    "loginAttempts" INTEGER NOT NULL DEFAULT 0,
    "lockedUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Campaign" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'planning',
    "targetArea" TEXT,
    "color" TEXT NOT NULL DEFAULT '#6B4423',
    "logoUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Campaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Job" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "totalItems" INTEGER NOT NULL DEFAULT 0,
    "processedItems" INTEGER NOT NULL DEFAULT 0,
    "errorLog" TEXT,
    "outputStats" TEXT,
    "data" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "Job_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScheduledJob" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" TEXT NOT NULL,
    "schedule" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "lastRunAt" TIMESTAMP(3),
    "nextRunAt" TIMESTAMP(3),
    "lastStatus" TEXT,
    "lastError" TEXT,
    "runCount" INTEGER NOT NULL DEFAULT 0,
    "data" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScheduledJob_pkey" PRIMARY KEY ("id")
);

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

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "resource" TEXT,
    "resourceId" TEXT,
    "details" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Party" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "abbr" TEXT NOT NULL,
    "description" TEXT,
    "color" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Party_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Precinct" (
    "id" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "name" TEXT,
    "description" TEXT,
    "pollingPlace" TEXT,
    "sourceDatasetId" TEXT,
    "syncedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Precinct_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Election" (
    "id" TEXT NOT NULL,
    "electionDate" TIMESTAMP(3) NOT NULL,
    "electionAbbr" TEXT,
    "electionDesc" TEXT,
    "electionType" TEXT,
    "name" TEXT,
    "shortName" TEXT,
    "electionTypeId" TEXT,
    "jurisdiction" TEXT,
    "districtLevel" TEXT,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "jurisdictionCode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Election_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Parcel" (
    "id" TEXT NOT NULL,
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
    "centroidLatitude" DOUBLE PRECISION,
    "centroidLongitude" DOUBLE PRECISION,
    "apn" TEXT,
    "externalId" TEXT,
    "externalSource" TEXT,
    "importedFrom" TEXT,
    "importedAt" TIMESTAMP(3),
    "sourceDatasetId" TEXT,
    "syncedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Parcel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Building" (
    "id" TEXT NOT NULL,
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
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "geocoded" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Building_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Household" (
    "id" TEXT NOT NULL,
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
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "geocoded" BOOLEAN NOT NULL DEFAULT false,
    "geocodedAt" TIMESTAMP(3),
    "geocodingProvider" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Household_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Person" (
    "id" TEXT NOT NULL,
    "title" TEXT,
    "firstName" TEXT NOT NULL,
    "middleName" TEXT,
    "lastName" TEXT NOT NULL,
    "nameSuffix" TEXT,
    "gender" TEXT,
    "birthDate" TIMESTAMP(3),
    "birthPlace" TEXT,
    "language" TEXT,
    "householdId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Person_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Location" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Location_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Address" (
    "id" TEXT NOT NULL,
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
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Address_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Phone" (
    "id" TEXT NOT NULL,
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
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Phone_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Email" (
    "id" TEXT NOT NULL,
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
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Email_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Voter" (
    "id" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "externalId" TEXT,
    "externalSource" TEXT,
    "registrationNumber" TEXT,
    "title" TEXT,
    "registrationDate" TIMESTAMP(3),
    "partyId" TEXT,
    "vbmStatus" TEXT,
    "precinctId" TEXT,
    "precinctPortion" TEXT,
    "importedFrom" TEXT,
    "importType" TEXT,
    "importFormat" TEXT,
    "importFile" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Voter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Volunteer" (
    "id" TEXT NOT NULL,
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
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Volunteer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Donor" (
    "id" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "totalContributed" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "lastContributionDate" TIMESTAMP(3),
    "lastContributionAmount" DOUBLE PRECISION,
    "donorTier" TEXT,
    "recurringAmount" DOUBLE PRECISION,
    "preferredAskAmount" DOUBLE PRECISION,
    "doNotContact" BOOLEAN NOT NULL DEFAULT false,
    "anonymousGiving" BOOLEAN NOT NULL DEFAULT false,
    "recognitionName" TEXT,
    "acknowledgeInPublic" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Donor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VoteHistory" (
    "id" TEXT NOT NULL,
    "voterId" TEXT NOT NULL,
    "electionId" TEXT,
    "ballotPartyId" TEXT,
    "electionDate" TIMESTAMP(3),
    "electionAbbr" TEXT,
    "electionDesc" TEXT,
    "electionType" TEXT,
    "participated" BOOLEAN NOT NULL,
    "votingMethod" TEXT,
    "ballotPartyName" TEXT,
    "districtId" TEXT,
    "districtName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VoteHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContactLog" (
    "id" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "outcome" TEXT,
    "notes" TEXT,
    "followUpNeeded" BOOLEAN NOT NULL DEFAULT false,
    "followUpDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContactLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Setting" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Setting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "election_types" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "election_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dataset_types" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dataset_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gis_datasets" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "datasetTypeId" TEXT NOT NULL,
    "sourceTable" TEXT,
    "geometryColumn" TEXT DEFAULT 'geom',
    "geometryType" "GeometryType",
    "srid" INTEGER NOT NULL DEFAULT 4326,
    "boundingBox" JSONB,
    "recordCount" INTEGER,
    "tags" TEXT[],
    "category" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "syncedToApp" BOOLEAN NOT NULL DEFAULT false,
    "lastSyncedToAppAt" TIMESTAMP(3),
    "syncedRecordCount" INTEGER,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT,

    CONSTRAINT "gis_datasets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "parcel_datasets" (
    "id" TEXT NOT NULL,
    "datasetId" TEXT NOT NULL,
    "apnField" TEXT NOT NULL DEFAULT 'apn',
    "addressField" TEXT DEFAULT 'address',
    "cityField" TEXT DEFAULT 'city',
    "zipField" TEXT DEFAULT 'zip',
    "ownerField" TEXT DEFAULT 'owner',
    "assessedValueField" TEXT DEFAULT 'assessed_value',
    "landUseField" TEXT DEFAULT 'land_use',
    "landUseCodeField" TEXT DEFAULT 'land_use_code',
    "yearBuiltField" TEXT DEFAULT 'year_built',
    "squareFeetField" TEXT DEFAULT 'square_feet',
    "lotSizeField" TEXT DEFAULT 'lot_size',
    "bedroomsField" TEXT DEFAULT 'bedrooms',
    "bathroomsField" TEXT DEFAULT 'bathrooms',
    "sourceAgency" TEXT,
    "sourceUrl" TEXT,
    "lastUpdated" TIMESTAMP(3),
    "updateFrequency" TEXT,
    "licenseInfo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "parcel_datasets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "precinct_datasets" (
    "id" TEXT NOT NULL,
    "datasetId" TEXT NOT NULL,
    "electionId" TEXT,
    "precinctIdField" TEXT NOT NULL DEFAULT 'precinct_id',
    "precinctNameField" TEXT DEFAULT 'precinct_name',
    "jurisdictionField" TEXT DEFAULT 'jurisdiction',
    "sourceAgency" TEXT,
    "sourceUrl" TEXT,
    "effectiveDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "precinct_datasets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "demographic_datasets" (
    "id" TEXT NOT NULL,
    "datasetId" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "geographyLevel" TEXT NOT NULL,
    "geoIdField" TEXT DEFAULT 'geoid',
    "populationField" TEXT DEFAULT 'total_population',
    "householdsField" TEXT DEFAULT 'households',
    "medianIncomeField" TEXT DEFAULT 'median_income',
    "medianAgeField" TEXT DEFAULT 'median_age',
    "whiteField" TEXT DEFAULT 'white_pop',
    "blackField" TEXT DEFAULT 'black_pop',
    "asianField" TEXT DEFAULT 'asian_pop',
    "hispanicField" TEXT DEFAULT 'hispanic_pop',
    "ownerOccupiedField" TEXT DEFAULT 'owner_occupied',
    "renterOccupiedField" TEXT DEFAULT 'renter_occupied',
    "medianHomeValueField" TEXT DEFAULT 'median_home_value',
    "customFields" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "demographic_datasets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contests" (
    "id" TEXT NOT NULL,
    "electionId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "contestType" TEXT NOT NULL,
    "district" TEXT,
    "districtDatasetId" TEXT,
    "description" TEXT,
    "seatName" TEXT,
    "isPartisan" BOOLEAN NOT NULL DEFAULT true,
    "votingMethod" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contest_choices" (
    "id" TEXT NOT NULL,
    "contestId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "choiceType" TEXT NOT NULL DEFAULT 'candidate',
    "partyAffiliation" TEXT,
    "displayOrder" INTEGER,
    "isIncumbent" BOOLEAN NOT NULL DEFAULT false,
    "isWinner" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contest_choices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "election_results" (
    "id" TEXT NOT NULL,
    "contestId" TEXT NOT NULL,
    "choiceId" TEXT NOT NULL,
    "precinctDatasetId" TEXT NOT NULL,
    "precinctIdentifier" TEXT NOT NULL,
    "voteCount" INTEGER NOT NULL,
    "totalVotes" INTEGER,
    "percentage" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "election_results_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Session_token_key" ON "Session"("token");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE INDEX "Session_expiresAt_idx" ON "Session"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "Campaign_id_key" ON "Campaign"("id");

-- CreateIndex
CREATE INDEX "Job_status_idx" ON "Job"("status");

-- CreateIndex
CREATE INDEX "Job_type_idx" ON "Job"("type");

-- CreateIndex
CREATE INDEX "Job_createdAt_idx" ON "Job"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ScheduledJob_name_key" ON "ScheduledJob"("name");

-- CreateIndex
CREATE INDEX "ScheduledJob_enabled_idx" ON "ScheduledJob"("enabled");

-- CreateIndex
CREATE INDEX "ScheduledJob_nextRunAt_idx" ON "ScheduledJob"("nextRunAt");

-- CreateIndex
CREATE INDEX "ScheduledJob_type_idx" ON "ScheduledJob"("type");

-- CreateIndex
CREATE UNIQUE INDEX "GeocoderProvider_providerId_key" ON "GeocoderProvider"("providerId");

-- CreateIndex
CREATE INDEX "GeocoderProvider_providerId_idx" ON "GeocoderProvider"("providerId");

-- CreateIndex
CREATE INDEX "GeocoderProvider_isEnabled_idx" ON "GeocoderProvider"("isEnabled");

-- CreateIndex
CREATE INDEX "GeocoderProvider_isPrimary_idx" ON "GeocoderProvider"("isPrimary");

-- CreateIndex
CREATE INDEX "AuditLog_userId_idx" ON "AuditLog"("userId");

-- CreateIndex
CREATE INDEX "AuditLog_action_idx" ON "AuditLog"("action");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

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
CREATE INDEX "Election_electionTypeId_idx" ON "Election"("electionTypeId");

-- CreateIndex
CREATE INDEX "Election_jurisdiction_idx" ON "Election"("jurisdiction");

-- CreateIndex
CREATE INDEX "Parcel_fullAddress_idx" ON "Parcel"("fullAddress");

-- CreateIndex
CREATE INDEX "Parcel_zipCode_idx" ON "Parcel"("zipCode");

-- CreateIndex
CREATE INDEX "Parcel_city_idx" ON "Parcel"("city");

-- CreateIndex
CREATE UNIQUE INDEX "Parcel_apn_externalSource_key" ON "Parcel"("apn", "externalSource");

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
CREATE INDEX "Household_parcelId_idx" ON "Household"("parcelId");

-- CreateIndex
CREATE INDEX "Household_city_idx" ON "Household"("city");

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
CREATE UNIQUE INDEX "Location_name_key" ON "Location"("name");

-- CreateIndex
CREATE INDEX "Location_name_idx" ON "Location"("name");

-- CreateIndex
CREATE INDEX "Location_category_idx" ON "Location"("category");

-- CreateIndex
CREATE INDEX "Address_personId_idx" ON "Address"("personId");

-- CreateIndex
CREATE INDEX "Address_locationId_idx" ON "Address"("locationId");

-- CreateIndex
CREATE INDEX "Address_isPrimary_idx" ON "Address"("isPrimary");

-- CreateIndex
CREATE INDEX "Address_isCurrently_idx" ON "Address"("isCurrently");

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
CREATE UNIQUE INDEX "Voter_personId_key" ON "Voter"("personId");

-- CreateIndex
CREATE INDEX "Voter_externalId_idx" ON "Voter"("externalId");

-- CreateIndex
CREATE INDEX "Voter_registrationNumber_idx" ON "Voter"("registrationNumber");

-- CreateIndex
CREATE INDEX "Voter_precinctId_idx" ON "Voter"("precinctId");

-- CreateIndex
CREATE UNIQUE INDEX "Voter_externalId_externalSource_key" ON "Voter"("externalId", "externalSource");

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

-- CreateIndex
CREATE INDEX "VoteHistory_voterId_idx" ON "VoteHistory"("voterId");

-- CreateIndex
CREATE INDEX "VoteHistory_electionDate_idx" ON "VoteHistory"("electionDate");

-- CreateIndex
CREATE INDEX "VoteHistory_participated_idx" ON "VoteHistory"("participated");

-- CreateIndex
CREATE INDEX "VoteHistory_votingMethod_idx" ON "VoteHistory"("votingMethod");

-- CreateIndex
CREATE UNIQUE INDEX "VoteHistory_voterId_electionDate_key" ON "VoteHistory"("voterId", "electionDate");

-- CreateIndex
CREATE INDEX "ContactLog_personId_idx" ON "ContactLog"("personId");

-- CreateIndex
CREATE INDEX "ContactLog_method_idx" ON "ContactLog"("method");

-- CreateIndex
CREATE INDEX "ContactLog_outcome_idx" ON "ContactLog"("outcome");

-- CreateIndex
CREATE INDEX "ContactLog_createdAt_idx" ON "ContactLog"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Setting_key_key" ON "Setting"("key");

-- CreateIndex
CREATE UNIQUE INDEX "election_types_name_key" ON "election_types"("name");

-- CreateIndex
CREATE INDEX "election_types_isActive_idx" ON "election_types"("isActive");

-- CreateIndex
CREATE INDEX "election_types_displayOrder_idx" ON "election_types"("displayOrder");

-- CreateIndex
CREATE UNIQUE INDEX "dataset_types_name_key" ON "dataset_types"("name");

-- CreateIndex
CREATE INDEX "dataset_types_isActive_idx" ON "dataset_types"("isActive");

-- CreateIndex
CREATE INDEX "dataset_types_displayOrder_idx" ON "dataset_types"("displayOrder");

-- CreateIndex
CREATE INDEX "dataset_types_category_idx" ON "dataset_types"("category");

-- CreateIndex
CREATE UNIQUE INDEX "gis_datasets_name_key" ON "gis_datasets"("name");

-- CreateIndex
CREATE INDEX "gis_datasets_datasetTypeId_idx" ON "gis_datasets"("datasetTypeId");

-- CreateIndex
CREATE INDEX "gis_datasets_isActive_idx" ON "gis_datasets"("isActive");

-- CreateIndex
CREATE INDEX "gis_datasets_category_idx" ON "gis_datasets"("category");

-- CreateIndex
CREATE INDEX "gis_datasets_syncedToApp_idx" ON "gis_datasets"("syncedToApp");

-- CreateIndex
CREATE UNIQUE INDEX "parcel_datasets_datasetId_key" ON "parcel_datasets"("datasetId");

-- CreateIndex
CREATE UNIQUE INDEX "precinct_datasets_datasetId_key" ON "precinct_datasets"("datasetId");

-- CreateIndex
CREATE INDEX "precinct_datasets_electionId_idx" ON "precinct_datasets"("electionId");

-- CreateIndex
CREATE UNIQUE INDEX "demographic_datasets_datasetId_key" ON "demographic_datasets"("datasetId");

-- CreateIndex
CREATE INDEX "contests_electionId_idx" ON "contests"("electionId");

-- CreateIndex
CREATE INDEX "contests_contestType_idx" ON "contests"("contestType");

-- CreateIndex
CREATE UNIQUE INDEX "contests_electionId_name_district_key" ON "contests"("electionId", "name", "district");

-- CreateIndex
CREATE INDEX "contest_choices_contestId_idx" ON "contest_choices"("contestId");

-- CreateIndex
CREATE UNIQUE INDEX "contest_choices_contestId_name_key" ON "contest_choices"("contestId", "name");

-- CreateIndex
CREATE INDEX "election_results_contestId_idx" ON "election_results"("contestId");

-- CreateIndex
CREATE INDEX "election_results_choiceId_idx" ON "election_results"("choiceId");

-- CreateIndex
CREATE INDEX "election_results_precinctDatasetId_precinctIdentifier_idx" ON "election_results"("precinctDatasetId", "precinctIdentifier");

-- CreateIndex
CREATE UNIQUE INDEX "election_results_contestId_choiceId_precinctIdentifier_key" ON "election_results"("contestId", "choiceId", "precinctIdentifier");

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Job" ADD CONSTRAINT "Job_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduledJob" ADD CONSTRAINT "ScheduledJob_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Precinct" ADD CONSTRAINT "Precinct_sourceDatasetId_fkey" FOREIGN KEY ("sourceDatasetId") REFERENCES "gis_datasets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Election" ADD CONSTRAINT "Election_electionTypeId_fkey" FOREIGN KEY ("electionTypeId") REFERENCES "election_types"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Parcel" ADD CONSTRAINT "Parcel_sourceDatasetId_fkey" FOREIGN KEY ("sourceDatasetId") REFERENCES "gis_datasets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Household" ADD CONSTRAINT "Household_buildingId_fkey" FOREIGN KEY ("buildingId") REFERENCES "Building"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Household" ADD CONSTRAINT "Household_parcelId_fkey" FOREIGN KEY ("parcelId") REFERENCES "Parcel"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Person" ADD CONSTRAINT "Person_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Address" ADD CONSTRAINT "Address_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Address" ADD CONSTRAINT "Address_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Phone" ADD CONSTRAINT "Phone_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Phone" ADD CONSTRAINT "Phone_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Email" ADD CONSTRAINT "Email_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Email" ADD CONSTRAINT "Email_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Voter" ADD CONSTRAINT "Voter_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Voter" ADD CONSTRAINT "Voter_partyId_fkey" FOREIGN KEY ("partyId") REFERENCES "Party"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Voter" ADD CONSTRAINT "Voter_precinctId_fkey" FOREIGN KEY ("precinctId") REFERENCES "Precinct"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Volunteer" ADD CONSTRAINT "Volunteer_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Donor" ADD CONSTRAINT "Donor_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VoteHistory" ADD CONSTRAINT "VoteHistory_voterId_fkey" FOREIGN KEY ("voterId") REFERENCES "Voter"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VoteHistory" ADD CONSTRAINT "VoteHistory_electionId_fkey" FOREIGN KEY ("electionId") REFERENCES "Election"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VoteHistory" ADD CONSTRAINT "VoteHistory_ballotPartyId_fkey" FOREIGN KEY ("ballotPartyId") REFERENCES "Party"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContactLog" ADD CONSTRAINT "ContactLog_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gis_datasets" ADD CONSTRAINT "gis_datasets_datasetTypeId_fkey" FOREIGN KEY ("datasetTypeId") REFERENCES "dataset_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gis_datasets" ADD CONSTRAINT "gis_datasets_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "parcel_datasets" ADD CONSTRAINT "parcel_datasets_datasetId_fkey" FOREIGN KEY ("datasetId") REFERENCES "gis_datasets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "precinct_datasets" ADD CONSTRAINT "precinct_datasets_datasetId_fkey" FOREIGN KEY ("datasetId") REFERENCES "gis_datasets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "precinct_datasets" ADD CONSTRAINT "precinct_datasets_electionId_fkey" FOREIGN KEY ("electionId") REFERENCES "Election"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "demographic_datasets" ADD CONSTRAINT "demographic_datasets_datasetId_fkey" FOREIGN KEY ("datasetId") REFERENCES "gis_datasets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contests" ADD CONSTRAINT "contests_electionId_fkey" FOREIGN KEY ("electionId") REFERENCES "Election"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contests" ADD CONSTRAINT "contests_districtDatasetId_fkey" FOREIGN KEY ("districtDatasetId") REFERENCES "gis_datasets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contest_choices" ADD CONSTRAINT "contest_choices_contestId_fkey" FOREIGN KEY ("contestId") REFERENCES "contests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "election_results" ADD CONSTRAINT "election_results_contestId_fkey" FOREIGN KEY ("contestId") REFERENCES "contests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "election_results" ADD CONSTRAINT "election_results_choiceId_fkey" FOREIGN KEY ("choiceId") REFERENCES "contest_choices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "election_results" ADD CONSTRAINT "election_results_precinctDatasetId_fkey" FOREIGN KEY ("precinctDatasetId") REFERENCES "precinct_datasets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
