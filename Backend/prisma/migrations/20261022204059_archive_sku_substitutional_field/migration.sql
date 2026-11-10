/*
  Warnings:

  - A unique constraint covering the columns `[sku]` on the table `Product` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[barcode]` on the table `Product` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "SurveyFrequency" AS ENUM ('DAILY', 'WEEKLY', 'MONTHLY', 'BI_YEARLY');

-- AlterEnum
ALTER TYPE "SurveyPeriodStatus" ADD VALUE 'ARCHIVED';

-- DropIndex
DROP INDEX "Product_barcode_idx";

-- DropIndex
DROP INDEX "Product_sku_idx";

-- AlterTable
ALTER TABLE "PriceObservation" ADD COLUMN     "substituteProduct" TEXT;

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "frequency" "SurveyFrequency" NOT NULL DEFAULT 'WEEKLY';

-- AlterTable
ALTER TABLE "User" ALTER COLUMN "phone" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Product_sku_key" ON "Product"("sku");

-- CreateIndex
CREATE UNIQUE INDEX "Product_barcode_key" ON "Product"("barcode");

-- CreateIndex
CREATE INDEX "Product_frequency_active_idx" ON "Product"("frequency", "active");
