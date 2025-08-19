/*
  Warnings:

  - A unique constraint covering the columns `[sessionId,wordId]` on the table `Answer` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Answer_sessionId_wordId_key" ON "public"."Answer"("sessionId", "wordId");
