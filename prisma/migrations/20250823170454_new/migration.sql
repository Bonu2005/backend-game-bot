/*
  Warnings:

  - You are about to drop the column `duration` on the `Game_Session` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "public"."Answer" ADD COLUMN     "deadline" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "public"."Game_Session" DROP COLUMN "duration",
ADD COLUMN     "chatId" TEXT;
