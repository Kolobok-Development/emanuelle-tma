/*
  Warnings:

  - You are about to drop the column `subscription_expires` on the `Users` table. All the data in the column will be lost.
  - You are about to drop the column `subscription_tier` on the `Users` table. All the data in the column will be lost.
  - You are about to drop the `SubscriptionHistory` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "OfferType" AS ENUM ('COMBO', 'ENERGY', 'DIAMOND');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED', 'CANCELLED');

-- AlterTable
ALTER TABLE "Chat" ADD COLUMN     "companion_id" TEXT;

-- AlterTable
ALTER TABLE "Users" DROP COLUMN "subscription_expires",
DROP COLUMN "subscription_tier",
ADD COLUMN     "diamonds" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "energy" INTEGER NOT NULL DEFAULT 0;

-- DropTable
DROP TABLE "SubscriptionHistory";

-- DropEnum
DROP TYPE "SubscriptionTier";

-- CreateTable
CREATE TABLE "AICompanion" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "avatar" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "personality" TEXT NOT NULL,
    "energyCost" INTEGER NOT NULL DEFAULT 5,
    "isPremium" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "imageSeed" TEXT,
    "visualAppearance" TEXT,

    CONSTRAINT "AICompanion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompanionSelection" (
    "id" TEXT NOT NULL,
    "telegram_user_id" BIGINT NOT NULL,
    "companion_id" TEXT NOT NULL,
    "selected_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CompanionSelection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Offers" (
    "id" TEXT NOT NULL,
    "offer_type" "OfferType" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "price_in_stars" INTEGER NOT NULL,
    "price_in_usd" DECIMAL(10,2) NOT NULL,
    "diamonds" INTEGER NOT NULL DEFAULT 0,
    "energy" INTEGER NOT NULL DEFAULT 0,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Offers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentTransactions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "offer_id" TEXT,
    "invoice_id" TEXT,
    "payload" TEXT,
    "amount" INTEGER NOT NULL,
    "amount_in_usd" DECIMAL(10,2) NOT NULL,
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "completed_at" TIMESTAMP(3),

    CONSTRAINT "PaymentTransactions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AICompanion_name_key" ON "AICompanion"("name");

-- CreateIndex
CREATE UNIQUE INDEX "CompanionSelection_telegram_user_id_key" ON "CompanionSelection"("telegram_user_id");

-- CreateIndex
CREATE INDEX "PaymentTransactions_invoice_id_idx" ON "PaymentTransactions"("invoice_id");

-- CreateIndex
CREATE INDEX "PaymentTransactions_offer_id_idx" ON "PaymentTransactions"("offer_id");

-- CreateIndex
CREATE INDEX "PaymentTransactions_status_idx" ON "PaymentTransactions"("status");

-- CreateIndex
CREATE INDEX "PaymentTransactions_user_id_idx" ON "PaymentTransactions"("user_id");
