-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'MANAGER', 'FIELD_AUDITOR');

-- CreateEnum
CREATE TYPE "SyncStatus" AS ENUM ('PENDING', 'SYNCED', 'FAILED');

-- CreateEnum
CREATE TYPE "AssignmentStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED');

-- CreateEnum
CREATE TYPE "PriceAction" AS ENUM ('PRICE_DOWN', 'PRICE_UP', 'KEEP');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT NOT NULL,
    "passwordHash" TEXT,
    "role" "Role" NOT NULL DEFAULT 'FIELD_AUDITOR',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "assignedMarkets" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "assignedCompetitors" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "unit" TEXT NOT NULL DEFAULT 'kg',
    "queensPrice" DOUBLE PRECISION NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Competitor" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "market" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'FMCG',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Competitor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SurveyPeriod" (
    "id" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',

    CONSTRAINT "SurveyPeriod_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SurveyAssignment" (
    "id" TEXT NOT NULL,
    "auditorId" TEXT NOT NULL,
    "competitorId" TEXT NOT NULL,
    "marketName" TEXT NOT NULL,
    "surveyPeriodId" TEXT NOT NULL,
    "items" TEXT[],
    "status" "AssignmentStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SurveyAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SurveyEntry" (
    "id" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "competitorId" TEXT NOT NULL,
    "marketName" TEXT NOT NULL,
    "auditorId" TEXT NOT NULL,
    "surveyPeriodId" TEXT,
    "price" DOUBLE PRECISION NOT NULL,
    "unit" TEXT NOT NULL DEFAULT 'kg',
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "accuracy" DOUBLE PRECISION,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "syncStatus" "SyncStatus" NOT NULL DEFAULT 'SYNCED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SurveyEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Alert" (
    "id" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "type" "PriceAction" NOT NULL,
    "severity" TEXT NOT NULL DEFAULT 'HIGH',
    "message" TEXT NOT NULL,
    "competitor" TEXT NOT NULL,
    "competitorPrice" DOUBLE PRECISION NOT NULL,
    "queensPrice" DOUBLE PRECISION NOT NULL,
    "priceIndex" DOUBLE PRECISION NOT NULL,
    "resolved" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Alert_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_phone_key" ON "User"("phone");

-- CreateIndex
CREATE INDEX "User_role_active_idx" ON "User"("role", "active");

-- CreateIndex
CREATE INDEX "Product_category_active_idx" ON "Product"("category", "active");

-- CreateIndex
CREATE INDEX "SurveyAssignment_auditorId_surveyPeriodId_idx" ON "SurveyAssignment"("auditorId", "surveyPeriodId");

-- CreateIndex
CREATE INDEX "SurveyEntry_itemId_competitorId_surveyPeriodId_idx" ON "SurveyEntry"("itemId", "competitorId", "surveyPeriodId");

-- CreateIndex
CREATE INDEX "SurveyEntry_auditorId_idx" ON "SurveyEntry"("auditorId");

-- CreateIndex
CREATE INDEX "Alert_resolved_type_idx" ON "Alert"("resolved", "type");

-- AddForeignKey
ALTER TABLE "SurveyAssignment" ADD CONSTRAINT "SurveyAssignment_auditorId_fkey" FOREIGN KEY ("auditorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SurveyAssignment" ADD CONSTRAINT "SurveyAssignment_competitorId_fkey" FOREIGN KEY ("competitorId") REFERENCES "Competitor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SurveyAssignment" ADD CONSTRAINT "SurveyAssignment_surveyPeriodId_fkey" FOREIGN KEY ("surveyPeriodId") REFERENCES "SurveyPeriod"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SurveyEntry" ADD CONSTRAINT "SurveyEntry_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SurveyEntry" ADD CONSTRAINT "SurveyEntry_competitorId_fkey" FOREIGN KEY ("competitorId") REFERENCES "Competitor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SurveyEntry" ADD CONSTRAINT "SurveyEntry_auditorId_fkey" FOREIGN KEY ("auditorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SurveyEntry" ADD CONSTRAINT "SurveyEntry_surveyPeriodId_fkey" FOREIGN KEY ("surveyPeriodId") REFERENCES "SurveyPeriod"("id") ON DELETE SET NULL ON UPDATE CASCADE;
