-- AlterTable
ALTER TABLE "public"."Game_Session" ADD COLUMN     "currentDeadline" TIMESTAMP(3),
ADD COLUMN     "currentWordId" TEXT;

-- AlterTable
ALTER TABLE "public"."Users" ADD COLUMN     "bestLevel" INTEGER,
ALTER COLUMN "telegramId" SET DATA TYPE TEXT;

-- CreateTable
CREATE TABLE "public"."ChatBest" (
    "id" TEXT NOT NULL,
    "chatId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "bestScore" INTEGER NOT NULL DEFAULT 0,
    "bestLevel" INTEGER,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChatBest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ChatBest_chatId_userId_key" ON "public"."ChatBest"("chatId", "userId");

-- AddForeignKey
ALTER TABLE "public"."ChatBest" ADD CONSTRAINT "ChatBest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."Users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
