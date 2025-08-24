/*
  Warnings:

  - Changed the type of `telegramId` on the `Users` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- AlterTable
ALTER TABLE "public"."Users" DROP COLUMN "telegramId",
ADD COLUMN     "telegramId" INTEGER NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Users_telegramId_key" ON "public"."Users"("telegramId");
