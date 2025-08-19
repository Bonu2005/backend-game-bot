-- CreateTable
CREATE TABLE "public"."Words" (
    "id" TEXT NOT NULL,
    "word_en" TEXT NOT NULL,
    "correct_uz" TEXT NOT NULL,
    "wrong_1" TEXT NOT NULL,
    "wrong_2" TEXT NOT NULL,
    "wrong_3" TEXT NOT NULL,
    "level" INTEGER NOT NULL,

    CONSTRAINT "Words_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Users" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "score" INTEGER NOT NULL DEFAULT 0,
    "last_played" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Game_Session" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "level" INTEGER NOT NULL,
    "score" INTEGER NOT NULL,
    "start_time" TIMESTAMP(3) NOT NULL,
    "ended_by" TEXT,
    "end_time" TIMESTAMP(3),

    CONSTRAINT "Game_Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."answers" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "wordId" TEXT NOT NULL,
    "selectedOption" TEXT NOT NULL,
    "isCorrect" BOOLEAN NOT NULL,
    "time_taken" INTEGER NOT NULL,

    CONSTRAINT "answers_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "public"."Game_Session" ADD CONSTRAINT "Game_Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."Users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."answers" ADD CONSTRAINT "answers_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "public"."Game_Session"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."answers" ADD CONSTRAINT "answers_wordId_fkey" FOREIGN KEY ("wordId") REFERENCES "public"."Words"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
