-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'MANAGER', 'FIELD_AUDITOR');

-- CreateEnum
CREATE TYPE "StoreType" AS ENUM ('FMCG', 'FRESH', 'BOTH');

-- CreateEnum
CREATE TYPE "SurveyPeriodStatus" AS ENUM ('DRAFT', 'OPEN', 'CLOSED');

-- CreateEnum
CREATE TYPE "AssignmentStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "AuditStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NEEDS_REVIEW');

-- CreateEnum
CREATE TYPE "ProductAvailability" AS ENUM ('AVAILABLE', 'OUT_OF_STOCK', 'NOT_FOUND');

-- CreateEnum
CREATE TYPE "SyncStatus" AS ENUM ('PENDING', 'SYNCING', 'SYNCED', 'FAILED');

-- CreateEnum
CREATE TYPE "ObservationReviewStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'NEEDS_REVIEW');

-- CreateEnum
CREATE TYPE "PriceAction" AS ENUM ('PRICE_DOWN', 'PRICE_UP', 'KEEP', 'REVIEW');

-- CreateEnum
CREATE TYPE "AlertSeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT NOT NULL,
    "passwordHash" TEXT,
    "role" "Role" NOT NULL DEFAULT 'FIELD_AUDITOR',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "locationPermission" TEXT DEFAULT 'NOT_REQUESTED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "sku" TEXT,
    "barcode" TEXT,
    "category" TEXT NOT NULL,
    "unit" TEXT NOT NULL DEFAULT 'kg',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Competitor" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "StoreType" NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Competitor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Store" (
    "id" TEXT NOT NULL,
    "competitorId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "city" TEXT,
    "area" TEXT,
    "type" "StoreType" NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "latitude" DECIMAL(10,7),
    "longitude" DECIMAL(10,7),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Store_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SurveyPeriod" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "status" "SurveyPeriodStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SurveyPeriod_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SurveyAssignment" (
    "id" TEXT NOT NULL,
    "auditorId" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "surveyPeriodId" TEXT NOT NULL,
    "status" "AssignmentStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SurveyAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssignmentItem" (
    "id" TEXT NOT NULL,
    "assignmentId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "required" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AssignmentItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Audit" (
    "id" TEXT NOT NULL,
    "assignmentId" TEXT NOT NULL,
    "auditorId" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "surveyPeriodId" TEXT NOT NULL,
    "status" "AuditStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "startLatitude" DECIMAL(10,7),
    "startLongitude" DECIMAL(10,7),
    "endLatitude" DECIMAL(10,7),
    "endLongitude" DECIMAL(10,7),
    "startAccuracyMeters" DECIMAL(8,2),
    "endAccuracyMeters" DECIMAL(8,2),
    "distanceFromStoreMeters" DECIMAL(10,2),
    "gpsValid" BOOLEAN,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Audit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QueensPrice" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "price" DECIMAL(12,2) NOT NULL,
    "effectiveFrom" TIMESTAMP(3) NOT NULL,
    "effectiveTo" TIMESTAMP(3),
    "source" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QueensPrice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PriceObservation" (
    "id" TEXT NOT NULL,
    "clientObservationId" TEXT NOT NULL,
    "auditId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "auditorId" TEXT NOT NULL,
    "availability" "ProductAvailability" NOT NULL DEFAULT 'AVAILABLE',
    "price" DECIMAL(12,2),
    "observedUnit" TEXT,
    "packageSize" TEXT,
    "capturedAt" TIMESTAMP(3) NOT NULL,
    "syncStatus" "SyncStatus" NOT NULL DEFAULT 'PENDING',
    "syncAttempts" INTEGER NOT NULL DEFAULT 0,
    "lastSyncAttemptAt" TIMESTAMP(3),
    "syncedAt" TIMESTAMP(3),
    "syncError" TEXT,
    "evidencePhotoUrl" TEXT,
    "notes" TEXT,
    "reviewStatus" "ObservationReviewStatus" NOT NULL DEFAULT 'PENDING',
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PriceObservation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PriceAnalysis" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "surveyPeriodId" TEXT NOT NULL,
    "queensPrice" DECIMAL(12,2) NOT NULL,
    "minimumCompetitorPrice" DECIMAL(12,2),
    "competitorAveragePrice" DECIMAL(12,2),
    "priceIndex" DECIMAL(8,2),
    "targetIndex" DECIMAL(8,2),
    "action" "PriceAction",
    "calculatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PriceAnalysis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Alert" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "surveyPeriodId" TEXT,
    "type" "PriceAction" NOT NULL,
    "severity" "AlertSeverity" NOT NULL DEFAULT 'MEDIUM',
    "message" TEXT NOT NULL,
    "queensPrice" DECIMAL(12,2) NOT NULL,
    "competitorPrice" DECIMAL(12,2),
    "priceIndex" DECIMAL(8,2),
    "resolved" BOOLEAN NOT NULL DEFAULT false,
    "resolvedById" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "resolutionNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Alert_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_phone_key" ON "User"("phone");

-- CreateIndex
CREATE INDEX "User_role_active_idx" ON "User"("role", "active");

-- CreateIndex
CREATE INDEX "User_active_idx" ON "User"("active");

-- CreateIndex
CREATE INDEX "Product_category_active_idx" ON "Product"("category", "active");

-- CreateIndex
CREATE INDEX "Product_sku_idx" ON "Product"("sku");

-- CreateIndex
CREATE INDEX "Product_barcode_idx" ON "Product"("barcode");

-- CreateIndex
CREATE INDEX "Product_active_idx" ON "Product"("active");

-- CreateIndex
CREATE INDEX "Competitor_active_idx" ON "Competitor"("active");

-- CreateIndex
CREATE INDEX "Store_competitorId_active_idx" ON "Store"("competitorId", "active");

-- CreateIndex
CREATE INDEX "Store_type_active_idx" ON "Store"("type", "active");

-- CreateIndex
CREATE INDEX "Store_latitude_longitude_idx" ON "Store"("latitude", "longitude");

-- CreateIndex
CREATE INDEX "SurveyPeriod_status_idx" ON "SurveyPeriod"("status");

-- CreateIndex
CREATE INDEX "SurveyPeriod_startDate_endDate_idx" ON "SurveyPeriod"("startDate", "endDate");

-- CreateIndex
CREATE INDEX "SurveyAssignment_auditorId_status_idx" ON "SurveyAssignment"("auditorId", "status");

-- CreateIndex
CREATE INDEX "SurveyAssignment_storeId_surveyPeriodId_idx" ON "SurveyAssignment"("storeId", "surveyPeriodId");

-- CreateIndex
CREATE INDEX "SurveyAssignment_surveyPeriodId_status_idx" ON "SurveyAssignment"("surveyPeriodId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "SurveyAssignment_auditorId_storeId_surveyPeriodId_key" ON "SurveyAssignment"("auditorId", "storeId", "surveyPeriodId");

-- CreateIndex
CREATE INDEX "AssignmentItem_productId_idx" ON "AssignmentItem"("productId");

-- CreateIndex
CREATE INDEX "AssignmentItem_assignmentId_idx" ON "AssignmentItem"("assignmentId");

-- CreateIndex
CREATE UNIQUE INDEX "AssignmentItem_assignmentId_productId_key" ON "AssignmentItem"("assignmentId", "productId");

-- CreateIndex
CREATE INDEX "Audit_assignmentId_idx" ON "Audit"("assignmentId");

-- CreateIndex
CREATE INDEX "Audit_auditorId_createdAt_idx" ON "Audit"("auditorId", "createdAt");

-- CreateIndex
CREATE INDEX "Audit_storeId_createdAt_idx" ON "Audit"("storeId", "createdAt");

-- CreateIndex
CREATE INDEX "Audit_surveyPeriodId_status_idx" ON "Audit"("surveyPeriodId", "status");

-- CreateIndex
CREATE INDEX "QueensPrice_productId_effectiveFrom_idx" ON "QueensPrice"("productId", "effectiveFrom");

-- CreateIndex
CREATE INDEX "QueensPrice_productId_effectiveTo_idx" ON "QueensPrice"("productId", "effectiveTo");

-- CreateIndex
CREATE UNIQUE INDEX "PriceObservation_clientObservationId_key" ON "PriceObservation"("clientObservationId");

-- CreateIndex
CREATE INDEX "PriceObservation_auditId_idx" ON "PriceObservation"("auditId");

-- CreateIndex
CREATE INDEX "PriceObservation_productId_capturedAt_idx" ON "PriceObservation"("productId", "capturedAt");

-- CreateIndex
CREATE INDEX "PriceObservation_auditorId_capturedAt_idx" ON "PriceObservation"("auditorId", "capturedAt");

-- CreateIndex
CREATE INDEX "PriceObservation_syncStatus_idx" ON "PriceObservation"("syncStatus");

-- CreateIndex
CREATE INDEX "PriceObservation_reviewStatus_idx" ON "PriceObservation"("reviewStatus");

-- CreateIndex
CREATE INDEX "PriceObservation_availability_idx" ON "PriceObservation"("availability");

-- CreateIndex
CREATE INDEX "PriceAnalysis_surveyPeriodId_action_idx" ON "PriceAnalysis"("surveyPeriodId", "action");

-- CreateIndex
CREATE INDEX "PriceAnalysis_productId_calculatedAt_idx" ON "PriceAnalysis"("productId", "calculatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "PriceAnalysis_productId_surveyPeriodId_key" ON "PriceAnalysis"("productId", "surveyPeriodId");

-- CreateIndex
CREATE INDEX "Alert_resolved_severity_idx" ON "Alert"("resolved", "severity");

-- CreateIndex
CREATE INDEX "Alert_surveyPeriodId_type_idx" ON "Alert"("surveyPeriodId", "type");

-- CreateIndex
CREATE INDEX "Alert_productId_createdAt_idx" ON "Alert"("productId", "createdAt");

-- AddForeignKey
ALTER TABLE "Store" ADD CONSTRAINT "Store_competitorId_fkey" FOREIGN KEY ("competitorId") REFERENCES "Competitor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SurveyAssignment" ADD CONSTRAINT "SurveyAssignment_auditorId_fkey" FOREIGN KEY ("auditorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SurveyAssignment" ADD CONSTRAINT "SurveyAssignment_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SurveyAssignment" ADD CONSTRAINT "SurveyAssignment_surveyPeriodId_fkey" FOREIGN KEY ("surveyPeriodId") REFERENCES "SurveyPeriod"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssignmentItem" ADD CONSTRAINT "AssignmentItem_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "SurveyAssignment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssignmentItem" ADD CONSTRAINT "AssignmentItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Audit" ADD CONSTRAINT "Audit_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "SurveyAssignment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Audit" ADD CONSTRAINT "Audit_auditorId_fkey" FOREIGN KEY ("auditorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Audit" ADD CONSTRAINT "Audit_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Audit" ADD CONSTRAINT "Audit_surveyPeriodId_fkey" FOREIGN KEY ("surveyPeriodId") REFERENCES "SurveyPeriod"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QueensPrice" ADD CONSTRAINT "QueensPrice_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PriceObservation" ADD CONSTRAINT "PriceObservation_auditId_fkey" FOREIGN KEY ("auditId") REFERENCES "Audit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PriceObservation" ADD CONSTRAINT "PriceObservation_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PriceObservation" ADD CONSTRAINT "PriceObservation_auditorId_fkey" FOREIGN KEY ("auditorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PriceObservation" ADD CONSTRAINT "PriceObservation_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PriceAnalysis" ADD CONSTRAINT "PriceAnalysis_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PriceAnalysis" ADD CONSTRAINT "PriceAnalysis_surveyPeriodId_fkey" FOREIGN KEY ("surveyPeriodId") REFERENCES "SurveyPeriod"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Alert" ADD CONSTRAINT "Alert_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Alert" ADD CONSTRAINT "Alert_surveyPeriodId_fkey" FOREIGN KEY ("surveyPeriodId") REFERENCES "SurveyPeriod"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Alert" ADD CONSTRAINT "Alert_resolvedById_fkey" FOREIGN KEY ("resolvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
