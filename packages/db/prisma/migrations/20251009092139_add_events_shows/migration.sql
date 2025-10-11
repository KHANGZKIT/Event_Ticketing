/*
  Warnings:

  - You are about to drop the column `start` on the `Show` table. All the data in the column will be lost.
  - Added the required column `startsAt` to the `Show` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "ShowStatus" AS ENUM ('scheduled', 'cancelled');

-- AlterTable
ALTER TABLE "Show" DROP COLUMN "start",
ADD COLUMN     "startsAt" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "status" "ShowStatus" NOT NULL DEFAULT 'scheduled';

-- CreateIndex
CREATE INDEX "Event_startsAt_idx" ON "Event"("startsAt");

-- CreateIndex
CREATE INDEX "Show_eventId_idx" ON "Show"("eventId");

-- CreateIndex
CREATE INDEX "Show_startsAt_idx" ON "Show"("startsAt");
