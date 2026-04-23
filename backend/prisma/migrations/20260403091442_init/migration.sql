-- CreateEnum
CREATE TYPE "RiskLevel" AS ENUM ('low', 'medium', 'high');

-- CreateEnum
CREATE TYPE "AssetStatus" AS ENUM ('draft', 'approved', 'published');

-- CreateEnum
CREATE TYPE "ExecutionPhase" AS ENUM ('manual', 'automation', 'api');

-- CreateEnum
CREATE TYPE "ExecutionStatus" AS ENUM ('pending', 'confirmed', 'executing', 'completed', 'failed', 'rolledback');

-- CreateEnum
CREATE TYPE "ExperimentStatus" AS ENUM ('running', 'paused', 'completed');

-- CreateEnum
CREATE TYPE "ExperimentDecision" AS ENUM ('pass', 'fail', 'pending');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "title" TEXT,
    "price" DOUBLE PRECISION,
    "category" TEXT,
    "imageUrls" JSONB,
    "rawData" JSONB,
    "budget" DOUBLE PRECISION NOT NULL,
    "riskLevel" "RiskLevel" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Strategy" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "viabilityScore" DOUBLE PRECISION,
    "marginEstimate" DOUBLE PRECISION,
    "competitionLevel" TEXT,
    "differentiationPlan" JSONB,
    "pricingStrategy" JSONB,
    "executionPlan" JSONB,
    "rawLlmResponse" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Strategy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ListingAsset" (
    "id" TEXT NOT NULL,
    "strategyId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "bulletPoints" JSONB NOT NULL,
    "description" TEXT NOT NULL,
    "imagePrompts" JSONB NOT NULL,
    "status" "AssetStatus" NOT NULL DEFAULT 'draft',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ListingAsset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Execution" (
    "id" TEXT NOT NULL,
    "listingAssetId" TEXT NOT NULL,
    "phase" "ExecutionPhase" NOT NULL,
    "status" "ExecutionStatus" NOT NULL DEFAULT 'pending',
    "actionLog" JSONB,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Execution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Experiment" (
    "id" TEXT NOT NULL,
    "executionId" TEXT NOT NULL,
    "templateName" TEXT,
    "durationDays" INTEGER NOT NULL,
    "budgetAllocation" DOUBLE PRECISION NOT NULL,
    "kpiTargets" JSONB NOT NULL,
    "status" "ExperimentStatus" NOT NULL DEFAULT 'running',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Experiment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExperimentResult" (
    "id" TEXT NOT NULL,
    "experimentId" TEXT NOT NULL,
    "day" INTEGER NOT NULL,
    "metrics" JSONB NOT NULL,
    "decision" "ExperimentDecision" NOT NULL DEFAULT 'pending',
    "suggestions" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExperimentResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActionLog" (
    "id" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "payload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ActionLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FeatureFlag" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "description" TEXT,

    CONSTRAINT "FeatureFlag_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "Product_userId_idx" ON "Product"("userId");

-- CreateIndex
CREATE INDEX "Strategy_productId_idx" ON "Strategy"("productId");

-- CreateIndex
CREATE INDEX "ListingAsset_strategyId_idx" ON "ListingAsset"("strategyId");

-- CreateIndex
CREATE INDEX "Execution_listingAssetId_idx" ON "Execution"("listingAssetId");

-- CreateIndex
CREATE INDEX "Experiment_executionId_idx" ON "Experiment"("executionId");

-- CreateIndex
CREATE INDEX "ExperimentResult_experimentId_idx" ON "ExperimentResult"("experimentId");

-- CreateIndex
CREATE INDEX "ActionLog_entityType_entityId_idx" ON "ActionLog"("entityType", "entityId");

-- CreateIndex
CREATE UNIQUE INDEX "FeatureFlag_name_key" ON "FeatureFlag"("name");

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Strategy" ADD CONSTRAINT "Strategy_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ListingAsset" ADD CONSTRAINT "ListingAsset_strategyId_fkey" FOREIGN KEY ("strategyId") REFERENCES "Strategy"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Execution" ADD CONSTRAINT "Execution_listingAssetId_fkey" FOREIGN KEY ("listingAssetId") REFERENCES "ListingAsset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Experiment" ADD CONSTRAINT "Experiment_executionId_fkey" FOREIGN KEY ("executionId") REFERENCES "Execution"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExperimentResult" ADD CONSTRAINT "ExperimentResult_experimentId_fkey" FOREIGN KEY ("experimentId") REFERENCES "Experiment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
