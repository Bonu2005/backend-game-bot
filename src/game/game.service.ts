import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { StartGameDto, SubmitAnswerDto } from './dto/create-game.dto';

const MAX_ANSWER_TIME = 5 * 1000; // мс, 5 секунд

@Injectable()
export class GameService {
  constructor(private prisma: PrismaService) {}

  // ===== START GAME =====
  async startGame(dto: StartGameDto, chatId?: string) {
    const { telegramId, username } = dto;

    let user = await this.prisma.users.findUnique({ where: { telegramId } });
    if (!user) {
      user = await this.prisma.users.create({
        data: { telegramId, username, score: 0 },
      });
    } else if (user.username !== username) {
      // опционально: обновлять ник, если изменился в TG
      await this.prisma.users.update({
        where: { id: user.id },
        data: { username },
      });
    }

    const session = await this.prisma.game_Session.create({
      data: {
        userId: user.id,
        level: null,
        chatId: chatId ?? null,
        score: 0,
        currentDeadline: null,
        currentWordId: null,
      },
    });

    return {
      session_id: session.id,
      telegramId,
      username,
      chatId: session.chatId,
      message: chatId
        ? 'Team/Chat session created. Please choose level.'
        : 'Game session created. Please choose level.',
    };
  }

  // ===== CHOOSE LEVEL =====
  async chooseLevel(sessionId: string, level: number) {
    const session = await this.prisma.game_Session.findUnique({ where: { id: sessionId } });
    if (!session) throw new NotFoundException('Session not found');
    if (session.level) throw new BadRequestException('Level already selected');

    const updated = await this.prisma.game_Session.update({
      where: { id: sessionId },
      data: { level },
    });

    return { message: `Level set to ${level}`, level: updated.level };
  }

  // ===== GET NEXT WORD (рандом без повторов + жёсткий дедлайн на бэке) =====
  async getNextWord(sessionId: string) {
    const session = await this.prisma.game_Session.findUnique({
      where: { id: sessionId },
      include: { answers: true },
    });

    if (!session) throw new NotFoundException('Session not found');
    if (!session.level) throw new BadRequestException('Level not selected yet');

    // если висит просроченный дедлайн — завершаем игру
    if (session.currentDeadline && new Date() > session.currentDeadline) {
      await this.endGame(sessionId);
      return { message: 'Time is up. Game ended.' };
    }

    const usedWordIds = session.answers.map((a) => a.wordId);

    const words = await this.prisma.words.findMany({
      where: { level: session.level, id: { notIn: usedWordIds } },
      select: { id: true, word_en: true, correct_uz: true, wrong_1: true, wrong_2: true, wrong_3: true },
    });

    if (!words.length) {
      await this.endGame(sessionId);
      return { message: 'No more words available. Game ended.' };
    }

    const word = words[Math.floor(Math.random() * words.length)];

    const options = this.shuffle([
      word.correct_uz,
      word.wrong_1,
      word.wrong_2,
      word.wrong_3,
    ]);

    const deadline = new Date(Date.now() + MAX_ANSWER_TIME);

    // запомним текущий вопрос и дедлайн в сессии (сервер контролит таймер)
    await this.prisma.game_Session.update({
      where: { id: sessionId },
      data: {
        currentWordId: word.id,
        currentDeadline: deadline,
      },
    });

    return {
      word_id: word.id,
      word_en: word.word_en,
      options,
      deadlineMs: deadline.getTime(), // фронту удобно миллисекунды
    };
  }

  // ===== SUBMIT ANSWER =====
  async submitAnswer(dto: SubmitAnswerDto) {
    const { session_id, word_id, selected, time_taken } = dto;

    const session = await this.prisma.game_Session.findUnique({
      where: { id: session_id },
      include: { user: true },
    });
    if (!session) throw new NotFoundException('Session not found');

    // проверяем, что отвечают на текущий вопрос
    if (!session.currentWordId || session.currentWordId !== word_id) {
      throw new ForbiddenException('This question is not active or already answered.');
    }

    // проверяем дедлайн
    const now = new Date();
    if (!session.currentDeadline || now > session.currentDeadline) {
      await this.endGame(session_id);
      return { message: 'Time is up. Game ended.' };
    }

    const word = await this.prisma.words.findUnique({ where: { id: word_id } });
    if (!word) throw new NotFoundException('Word not found');

    const isCorrect = selected === word.correct_uz;

    // фиксируем ответ
    await this.prisma.answer.create({
      data: {
        sessionId: session_id,
        wordId: word_id,
        selectedOption: selected,
        isCorrect,
        time_taken,
        deadline: session.currentDeadline,
      },
    });

    // инкремент очков за правильный ответ
    if (isCorrect) {
      await this.prisma.game_Session.update({
        where: { id: session_id },
        data: { score: { increment: 1 } },
      });
    }

    // очистим "текущий вопрос" — следующий вызов getNextWord поставит новый дедлайн
    await this.prisma.game_Session.update({
      where: { id: session_id },
      data: { currentWordId: null, currentDeadline: null },
    });

    return { isCorrect };
  }

  // ===== END GAME =====
  private async endGame(sessionId: string) {
    const session = await this.prisma.game_Session.findUnique({
      where: { id: sessionId },
      include: { user: true },
    });
    if (!session) return;

    const updated = await this.prisma.game_Session.update({
      where: { id: sessionId },
      data: { end_time: new Date(), currentWordId: null, currentDeadline: null },
    });

    // Глобальный личный рекорд игрока (вне чатов) — обновляем только если улучшил
    if (updated.score > (session.user.score ?? 0)) {
      await this.prisma.users.update({
        where: { id: session.userId },
        data: { score: updated.score, bestLevel: session.level ?? null },
      });
    }

    // Рекорд в конкретном чате (личка/группа)
    if (session.chatId) {
      const existing = await this.prisma.chatBest.findUnique({
        where: { chatId_userId: { chatId: session.chatId, userId: session.userId } },
      });

      if (!existing || updated.score > existing.bestScore) {
        await this.prisma.chatBest.upsert({
          where: { chatId_userId: { chatId: session.chatId, userId: session.userId } },
          update: { bestScore: updated.score, bestLevel: session.level ?? null },
          create: {
            chatId: session.chatId,
            userId: session.userId,
            bestScore: updated.score,
            bestLevel: session.level ?? null,
          },
        });
      }
    }
  }

  // ===== GET RESULT (по сессии) =====
  async getResult(sessionId: string) {
    const session = await this.prisma.game_Session.findUnique({
      where: { id: sessionId },
      include: { answers: true, user: true },
    });

    if (!session) throw new NotFoundException('Session not found');

    return {
      username: session.user.username,
      level: session.level,
      total_score: session.score,
      total_answers: session.answers.length,
      ended_at: session.end_time,
      chatId: session.chatId,
    };
  }

  // ===== LEADERBOARD =====
  // Без параметров — глобальный (по Users.score)
  async getGlobalLeaderboard() {
    const users = await this.prisma.users.findMany({
      orderBy: { score: 'desc' },
      select: { username: true, score: true, bestLevel: true },
    });

    return users.map((u, index) => {
      let league = 'Bronze';
      if (index < 3) league = 'Gold';
      else if (index < 10) league = 'Silver';

      return {
        place: index + 1,
        username: u.username,
        score: u.score,
        bestLevel: u.bestLevel,
        league,
      };
    });
  }

  // По чату — из ChatBest
  async getChatLeaderboard(chatId: string) {
    if (!chatId) throw new BadRequestException('chatId is required');

    const rows = await this.prisma.chatBest.findMany({
      where: { chatId },
      include: { user: { select: { username: true } } },
      orderBy: { bestScore: 'desc' },
    });

    return rows.map((r, index) => ({
      place: index + 1,
      username: r.user.username,
      score: r.bestScore,
      bestLevel: r.bestLevel,
    }));
  }

  // ===== Вспомогалка =====
  private shuffle(arr: string[]) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  // опционально: для дебага/админки
  async getTgIdUsername(sessionId: string) {
    const findUs = await this.prisma.game_Session.findFirst({
      where: { id: sessionId },
      include: { user: true },
    });
    if (!findUs) throw new NotFoundException('Session not found');
    return { telegramId: findUs.user.telegramId, username: findUs.user.username };
  }
}
