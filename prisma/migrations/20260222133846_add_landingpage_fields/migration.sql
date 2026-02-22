/*
  Warnings:

  - Added the required column `updatedAt` to the `LandingPage` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "LandingPage_projectId_idx";

-- AlterTable
ALTER TABLE "LandingPage" ADD COLUMN     "name" TEXT NOT NULL DEFAULT 'Untitled',
ADD COLUMN     "prompt_json" JSONB,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;
