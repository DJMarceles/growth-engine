-- CreateEnum
CREATE TYPE "OrgType" AS ENUM ('AGENCY', 'CLIENT');
CREATE TYPE "OrgRole" AS ENUM ('OWNER', 'ADMIN', 'OPERATOR', 'ANALYST');
CREATE TYPE "ExperimentStatus" AS ENUM ('PLANNED', 'RUNNING', 'STOPPED', 'COMPLETED');

CREATE TABLE "Organization" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "type" "OrgType" NOT NULL DEFAULT 'CLIENT',
  "parentOrgId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "Organization" ADD CONSTRAINT "Organization_parentOrgId_fkey"
  FOREIGN KEY ("parentOrgId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "Membership" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "orgId" TEXT NOT NULL,
  "role" "OrgRole" NOT NULL DEFAULT 'ANALYST',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Membership_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Membership_userId_orgId_key" UNIQUE ("userId", "orgId")
);
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_orgId_fkey"
  FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "orgId" TEXT;
ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "billingOwnerOrgId" TEXT;
ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "metaAdAccountId" TEXT;
ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "pixelId" TEXT;

ALTER TABLE "Account" ADD COLUMN IF NOT EXISTS "encrypted_meta_token" TEXT;

CREATE TABLE "MetaAdAccount" (
  "id" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "adAccountId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "currency" TEXT NOT NULL,
  "timezone" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MetaAdAccount_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "MetaAdAccount" ADD CONSTRAINT "MetaAdAccount_projectId_fkey"
  FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "AdCampaign" (
  "id" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "metaCampaignId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "objective" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PAUSED',
  "dailyBudgetCents" INTEGER,
  "lifetimeBudgetCents" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AdCampaign_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "AdCampaign" ADD CONSTRAINT "AdCampaign_projectId_fkey"
  FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "AdSet" (
  "id" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "metaAdSetId" TEXT NOT NULL,
  "campaignId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "targeting_json" JSONB NOT NULL,
  "optimizationGoal" TEXT NOT NULL,
  "billingEvent" TEXT NOT NULL,
  "bidStrategy" TEXT NOT NULL,
  "budgetCents" INTEGER NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PAUSED',
  "startTime" TIMESTAMP(3) NOT NULL,
  "endTime" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AdSet_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "AdSet" ADD CONSTRAINT "AdSet_projectId_fkey"
  FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AdSet" ADD CONSTRAINT "AdSet_campaignId_fkey"
  FOREIGN KEY ("campaignId") REFERENCES "AdCampaign"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "AdCreative" (
  "id" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "metaCreativeId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "asset_json" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AdCreative_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "AdCreative" ADD CONSTRAINT "AdCreative_projectId_fkey"
  FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "Ad" (
  "id" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "metaAdId" TEXT NOT NULL,
  "adSetId" TEXT NOT NULL,
  "creativeId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PAUSED',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Ad_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "Ad" ADD CONSTRAINT "Ad_projectId_fkey"
  FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Ad" ADD CONSTRAINT "Ad_adSetId_fkey"
  FOREIGN KEY ("adSetId") REFERENCES "AdSet"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Ad" ADD CONSTRAINT "Ad_creativeId_fkey"
  FOREIGN KEY ("creativeId") REFERENCES "AdCreative"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "InsightDaily" (
  "id" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "date" TIMESTAMP(3) NOT NULL,
  "level" TEXT NOT NULL,
  "entityId" TEXT NOT NULL,
  "metrics_json" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "InsightDaily_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "InsightDaily_projectId_date_level_entityId_key" UNIQUE ("projectId", "date", "level", "entityId")
);
ALTER TABLE "InsightDaily" ADD CONSTRAINT "InsightDaily_projectId_fkey"
  FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "Experiment" (
  "id" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "status" "ExperimentStatus" NOT NULL DEFAULT 'PLANNED',
  "hypothesis" TEXT NOT NULL,
  "variants_json" JSONB NOT NULL,
  "decisionRules_json" JSONB NOT NULL,
  "startedAt" TIMESTAMP(3),
  "endedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Experiment_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "Experiment" ADD CONSTRAINT "Experiment_projectId_fkey"
  FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "ExperimentRun" (
  "id" TEXT NOT NULL,
  "experimentId" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "allocations_json" JSONB NOT NULL,
  "results_json" JSONB NOT NULL,
  "decision_json" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ExperimentRun_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "ExperimentRun" ADD CONSTRAINT "ExperimentRun_experimentId_fkey"
  FOREIGN KEY ("experimentId") REFERENCES "Experiment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "EvidenceSnapshot" (
  "id" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "experimentId" TEXT,
  "source" TEXT NOT NULL,
  "snapshot_json" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "EvidenceSnapshot_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "EvidenceSnapshot" ADD CONSTRAINT "EvidenceSnapshot_projectId_fkey"
  FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "DecisionLog" (
  "id" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "decisionType" TEXT NOT NULL,
  "decision_json" JSONB NOT NULL,
  "evidenceRefs_json" JSONB NOT NULL,
  "promptHash" TEXT,
  "model" TEXT,
  "createdByUserId" TEXT,
  "createdByAgentName" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DecisionLog_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "DecisionLog" ADD CONSTRAINT "DecisionLog_projectId_fkey"
  FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DecisionLog" ADD CONSTRAINT "DecisionLog_createdByUserId_fkey"
  FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "LandingMetricDaily" (
  "id" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "date" TIMESTAMP(3) NOT NULL,
  "eventType" TEXT NOT NULL,
  "count" INTEGER NOT NULL DEFAULT 0,
  "metadata_json" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LandingMetricDaily_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "LandingMetricDaily_projectId_date_eventType_key" UNIQUE ("projectId", "date", "eventType")
);
ALTER TABLE "LandingMetricDaily" ADD CONSTRAINT "LandingMetricDaily_projectId_fkey"
  FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
