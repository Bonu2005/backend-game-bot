/*
  Warnings:

  - You are about to drop the column `ended_by` on the `Game_Session` table. All the data in the column will be lost.
  - You are about to drop the column `last_played` on the `Users` table. All the data in the column will be lost.
  - You are about to drop the `answers` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[telegramId]` on the table `Users` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `telegramId` to the `Users` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "public"."answers" DROP CONSTRAINT "answers_sessionId_fkey";

-- DropForeignKey
ALTER TABLE "public"."answers" DROP CONSTRAINT "answers_wordId_fkey";

-- AlterTable
ALTER TABLE "public"."Game_Session" DROP COLUMN "ended_by",
ADD COLUMN     "duration" INTEGER NOT NULL DEFAULT 50;

-- AlterTable
ALTER TABLE "public"."Users" DROP COLUMN "last_played",
ADD COLUMN     "telegramId" TEXT NOT NULL;

-- DropTable
DROP TABLE "public"."answers";

-- CreateTable
CREATE TABLE "public"."Answer" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "wordId" TEXT NOT NULL,
    "selectedOption" TEXT NOT NULL,
    "isCorrect" BOOLEAN NOT NULL,
    "time_taken" INTEGER NOT NULL,

    CONSTRAINT "Answer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Users_telegramId_key" ON "public"."Users"("telegramId");

-- AddForeignKey
ALTER TABLE "public"."Answer" ADD CONSTRAINT "Answer_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "public"."Game_Session"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Answer" ADD CONSTRAINT "Answer_wordId_fkey" FOREIGN KEY ("wordId") REFERENCES "public"."Words"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
