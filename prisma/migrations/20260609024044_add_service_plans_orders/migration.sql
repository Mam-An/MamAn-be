/*
  Warnings:

  - The `rewardResource` column on the `CareTask` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `verifyType` column on the `CareTask` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - Changed the type of `mood` on the `MoodJournal` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "MoodType" AS ENUM ('HAPPY', 'CALM', 'NORMAL', 'SAD', 'ANXIOUS', 'TIRED');

-- CreateEnum
CREATE TYPE "TaskVerifyType" AS ENUM ('SELF_CONFIRM', 'TIMER', 'PHOTO_REQUIRED', 'PHOTO_OPTIONAL');

-- CreateEnum
CREATE TYPE "PlantResourceType" AS ENUM ('WATER', 'SUNLIGHT', 'FERTILIZER', 'AIR', 'LOVE', 'DEW');

-- CreateEnum
CREATE TYPE "CommunityPostVisibility" AS ENUM ('PUBLIC', 'ANONYMOUS');

-- CreateEnum
CREATE TYPE "CommunityPostStatus" AS ENUM ('VISIBLE', 'HIDDEN', 'REPORTED', 'REJECTED');

-- CreateEnum
CREATE TYPE "CommunityReactionType" AS ENUM ('LOVE', 'LIGHT', 'SPROUT', 'HUG', 'THANKS');

-- CreateEnum
CREATE TYPE "PlanCode" AS ENUM ('FREE', 'VIRTUAL_PLUS', 'SUNFLOWER_COMPANION', 'SUNFLOWER_PREMIUM_GIFT');

-- CreateEnum
CREATE TYPE "PlanType" AS ENUM ('FREE', 'SUBSCRIPTION', 'ONE_TIME');

-- CreateEnum
CREATE TYPE "PlantMode" AS ENUM ('VIRTUAL', 'REAL');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('PENDING', 'PAID', 'CANCELLED', 'REFUNDED', 'FULFILLING', 'COMPLETED');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('MANUAL_BANK_TRANSFER', 'CASH', 'MOMO', 'ZALOPAY', 'OTHER');

-- CreateEnum
CREATE TYPE "GiftRecipientType" AS ENUM ('SELF', 'FRIEND', 'DONATION');

-- CreateEnum
CREATE TYPE "ShippingStatus" AS ENUM ('NOT_REQUIRED', 'PENDING', 'PREPARING', 'SHIPPING', 'DELIVERED', 'FAILED');

-- DropIndex
DROP INDEX "CareTaskLog_userId_idx";

-- DropIndex
DROP INDEX "MoodJournal_userId_idx";

-- AlterTable
ALTER TABLE "CareTask" ADD COLUMN     "characterImageUrl" VARCHAR(500),
ADD COLUMN     "isShareable" BOOLEAN NOT NULL DEFAULT false,
DROP COLUMN "rewardResource",
ADD COLUMN     "rewardResource" "PlantResourceType" NOT NULL DEFAULT 'WATER',
DROP COLUMN "verifyType",
ADD COLUMN     "verifyType" "TaskVerifyType" NOT NULL DEFAULT 'SELF_CONFIRM';

-- AlterTable
ALTER TABLE "CareTaskLog" ADD COLUMN     "cloudinaryPublicId" VARCHAR(255),
ADD COLUMN     "note" TEXT,
ADD COLUMN     "photoUrl" VARCHAR(500),
ADD COLUMN     "sharedToCommunity" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "FlowerType" ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "stageDurations" JSONB,
ADD COLUMN     "stageImages" JSONB;

-- AlterTable
ALTER TABLE "MoodJournal" ADD COLUMN     "aiMetadata" JSONB,
ADD COLUMN     "aiReply" TEXT,
DROP COLUMN "mood",
ADD COLUMN     "mood" "MoodType" NOT NULL;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "expoPushToken" VARCHAR(500);

-- AlterTable
ALTER TABLE "VirtualPlant" ADD COLUMN     "airAmount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "dewAmount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "fertilizerAmount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "lastCaredAt" TIMESTAMPTZ(3),
ADD COLUMN     "loveAmount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "resourceUsage" JSONB,
ADD COLUMN     "sunlightAmount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "waterAmount" INTEGER NOT NULL DEFAULT 0;

-- DropEnum
DROP TYPE "MoodLevel";

-- DropEnum
DROP TYPE "ResourceType";

-- DropEnum
DROP TYPE "VerifyType";

-- CreateTable
CREATE TABLE "CommunityPost" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "taskLogId" UUID,
    "content" TEXT,
    "imageUrl" VARCHAR(500),
    "visibility" "CommunityPostVisibility" NOT NULL DEFAULT 'ANONYMOUS',
    "status" "CommunityPostStatus" NOT NULL DEFAULT 'VISIBLE',
    "reportCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "CommunityPost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommunityReaction" (
    "id" UUID NOT NULL,
    "postId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "type" "CommunityReactionType" NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommunityReaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommunityReport" (
    "id" UUID NOT NULL,
    "postId" UUID NOT NULL,
    "reporterId" UUID NOT NULL,
    "reason" VARCHAR(255) NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommunityReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CalmMusicTrack" (
    "id" UUID NOT NULL,
    "titleVi" VARCHAR(255) NOT NULL,
    "hasLyrics" BOOLEAN NOT NULL DEFAULT false,
    "category" VARCHAR(100) NOT NULL DEFAULT 'general',
    "storagePath" VARCHAR(500) NOT NULL,
    "publicUrl" VARCHAR(500) NOT NULL,
    "originalName" VARCHAR(255),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "CalmMusicTrack_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServicePlan" (
    "id" UUID NOT NULL,
    "code" "PlanCode" NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "type" "PlanType" NOT NULL,
    "plantMode" "PlantMode" NOT NULL,
    "price" INTEGER NOT NULL,
    "durationDays" INTEGER,
    "includedSongs" INTEGER NOT NULL DEFAULT 0,
    "maxRedeemSongs" INTEGER NOT NULL DEFAULT 0,
    "hasAiJournalReply" BOOLEAN NOT NULL DEFAULT false,
    "hasMoodAnalytics" BOOLEAN NOT NULL DEFAULT false,
    "hasMoodTaskSuggest" BOOLEAN NOT NULL DEFAULT false,
    "hasRealPlant" BOOLEAN NOT NULL DEFAULT false,
    "hasFarmerUpdates" BOOLEAN NOT NULL DEFAULT false,
    "updateIntervalDays" INTEGER,
    "includesShipping" BOOLEAN NOT NULL DEFAULT false,
    "hasPotCustom" BOOLEAN NOT NULL DEFAULT false,
    "hasGiftCard" BOOLEAN NOT NULL DEFAULT false,
    "hasGiftPackaging" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "ServicePlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserSubscription" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "planId" UUID NOT NULL,
    "startsAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endsAt" TIMESTAMPTZ(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "autoRenew" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "UserSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Order" (
    "id" UUID NOT NULL,
    "orderCode" VARCHAR(30) NOT NULL,
    "userId" UUID NOT NULL,
    "planId" UUID NOT NULL,
    "status" "OrderStatus" NOT NULL DEFAULT 'PENDING',
    "paymentMethod" "PaymentMethod",
    "paidAt" TIMESTAMPTZ(3),
    "subtotalAmount" INTEGER NOT NULL,
    "shippingFee" INTEGER NOT NULL DEFAULT 0,
    "discountAmount" INTEGER NOT NULL DEFAULT 0,
    "totalAmount" INTEGER NOT NULL,
    "recipientType" "GiftRecipientType" NOT NULL DEFAULT 'SELF',
    "recipientName" VARCHAR(200),
    "recipientPhone" VARCHAR(20),
    "recipientAddress" TEXT,
    "recipientNote" TEXT,
    "giftMessage" TEXT,
    "giftCardTheme" VARCHAR(100),
    "potCustomOption" VARCHAR(255),
    "packagingOption" VARCHAR(255),
    "shippingStatus" "ShippingStatus" NOT NULL DEFAULT 'PENDING',
    "realPlantId" UUID,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CommunityPost_taskLogId_key" ON "CommunityPost"("taskLogId");

-- CreateIndex
CREATE INDEX "CommunityPost_createdAt_idx" ON "CommunityPost"("createdAt");

-- CreateIndex
CREATE INDEX "CommunityPost_status_idx" ON "CommunityPost"("status");

-- CreateIndex
CREATE INDEX "CommunityPost_userId_idx" ON "CommunityPost"("userId");

-- CreateIndex
CREATE INDEX "CommunityReaction_postId_idx" ON "CommunityReaction"("postId");

-- CreateIndex
CREATE INDEX "CommunityReaction_userId_idx" ON "CommunityReaction"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "CommunityReaction_postId_userId_type_key" ON "CommunityReaction"("postId", "userId", "type");

-- CreateIndex
CREATE INDEX "CommunityReport_postId_idx" ON "CommunityReport"("postId");

-- CreateIndex
CREATE INDEX "CommunityReport_reporterId_idx" ON "CommunityReport"("reporterId");

-- CreateIndex
CREATE UNIQUE INDEX "CalmMusicTrack_storagePath_key" ON "CalmMusicTrack"("storagePath");

-- CreateIndex
CREATE INDEX "CalmMusicTrack_hasLyrics_idx" ON "CalmMusicTrack"("hasLyrics");

-- CreateIndex
CREATE INDEX "CalmMusicTrack_category_idx" ON "CalmMusicTrack"("category");

-- CreateIndex
CREATE INDEX "CalmMusicTrack_isActive_idx" ON "CalmMusicTrack"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "ServicePlan_code_key" ON "ServicePlan"("code");

-- CreateIndex
CREATE INDEX "UserSubscription_userId_idx" ON "UserSubscription"("userId");

-- CreateIndex
CREATE INDEX "UserSubscription_planId_idx" ON "UserSubscription"("planId");

-- CreateIndex
CREATE INDEX "UserSubscription_isActive_idx" ON "UserSubscription"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "Order_orderCode_key" ON "Order"("orderCode");

-- CreateIndex
CREATE INDEX "Order_userId_idx" ON "Order"("userId");

-- CreateIndex
CREATE INDEX "Order_planId_idx" ON "Order"("planId");

-- CreateIndex
CREATE INDEX "Order_status_idx" ON "Order"("status");

-- CreateIndex
CREATE INDEX "Order_createdAt_idx" ON "Order"("createdAt");

-- CreateIndex
CREATE INDEX "CareTaskLog_userId_completedAt_idx" ON "CareTaskLog"("userId", "completedAt");

-- CreateIndex
CREATE INDEX "MoodJournal_userId_createdAt_idx" ON "MoodJournal"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "CommunityPost" ADD CONSTRAINT "CommunityPost_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityPost" ADD CONSTRAINT "CommunityPost_taskLogId_fkey" FOREIGN KEY ("taskLogId") REFERENCES "CareTaskLog"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityReaction" ADD CONSTRAINT "CommunityReaction_postId_fkey" FOREIGN KEY ("postId") REFERENCES "CommunityPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityReaction" ADD CONSTRAINT "CommunityReaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityReport" ADD CONSTRAINT "CommunityReport_postId_fkey" FOREIGN KEY ("postId") REFERENCES "CommunityPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityReport" ADD CONSTRAINT "CommunityReport_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserSubscription" ADD CONSTRAINT "UserSubscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserSubscription" ADD CONSTRAINT "UserSubscription_planId_fkey" FOREIGN KEY ("planId") REFERENCES "ServicePlan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_planId_fkey" FOREIGN KEY ("planId") REFERENCES "ServicePlan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_realPlantId_fkey" FOREIGN KEY ("realPlantId") REFERENCES "RealPlant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
