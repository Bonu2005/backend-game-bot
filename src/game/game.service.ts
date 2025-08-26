import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { StartGameDto, SubmitAnswerDto } from './dto/create-game.dto';
import { error } from 'console';

const MAX_ANSWER_TIME = 5 * 1000; // мс, 5 секунд

@Injectable()
export class GameService {
  constructor(private prisma: PrismaService) { }


  async startGame(dto: StartGameDto) {
    const { telegramId, username, chatId } = dto;

    let user = await this.prisma.users.findUnique({ where: { telegramId } });
    if (!user) {
      user = await this.prisma.users.create({
        data: { telegramId, username, score: 0 },
      });
    } else if (user.username !== username) {

      await this.prisma.users.update({
        where: { id: user.id },
        data: { username },
      });
    }
    console.log(user);

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
    console.log(session);

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

  async getNextWord(sessionId: string) {
    try {
      const session = await this.prisma.game_Session.findUnique({
        where: { id: sessionId },
        include: { answers: true },
      });
      console.log(sessionId)
      if (!session) throw new NotFoundException('Session not found');
      if (!session.level) throw new BadRequestException('Level not selected yet');

      if (session.currentDeadline && new Date() > session.currentDeadline) {
        console.log("time ended")
        await this.endGame(sessionId);
        return { message: 'Time is up. Game ended.' };
      }

      const usedWordIds = session.answers.map((a) => a.wordId);

      const words = await this.prisma.words.findMany({
        where: { level: session.level, id: { notIn: usedWordIds } },
        select: { id: true, word_en: true, correct_uz: true, wrong_1: true, wrong_2: true, wrong_3: true },
      });
      console.log("words", words)
      if (!words.length) {
        await this.endGame(sessionId);
        console.log("no words available")
        return { message: 'No more words available. Game ended.' };
      }

      const word = words[Math.floor(Math.random() * words.length)];

      const options = this.shuffle([
        word.correct_uz,
        word.wrong_1,
        word.wrong_2,
        word.wrong_3,
      ]);
      console.log(options)
      const deadline = new Date(Date.now() + MAX_ANSWER_TIME);
      console.log(deadline)

      await this.prisma.game_Session.update({
        where: { id: sessionId },
        data: {
          currentWordId: word.id,
          currentDeadline: deadline,
        },
      });
      console.log(word.id, word.word_en, options)
      return {
        word_id: word.id,
        word_en: word.word_en,
        options,
        timeLimitMs: 5000
      };

    } catch (error) {
      console.log(error);

    }
  }

  async submitAnswer(dto: SubmitAnswerDto) {
    const { session_id, word_id, selected, time_taken } = dto;
    console.log("dto", dto)
    const session = await this.prisma.game_Session.findUnique({
      where: { id: session_id },
      include: { user: true },
    });
    if (!session) throw new NotFoundException('Session not found');


    if (!session.currentWordId || session.currentWordId !== word_id) {
      throw new ForbiddenException('This question is not active or already answered.');
    }


    const now = new Date();
    if (!session.currentDeadline || now > session.currentDeadline) {
      await this.endGame(session_id);
      return { message: 'Time is up. Game ended.' };
    }

    const word = await this.prisma.words.findUnique({ where: { id: word_id } });
    if (!word) throw new NotFoundException('Word not found');

    const isCorrect = selected === word.correct_uz;


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


    if (isCorrect) {
      await this.prisma.game_Session.update({
        where: { id: session_id },
        data: { score: { increment: 1 } },
      });
    }


    await this.prisma.game_Session.update({
      where: { id: session_id },
      data: { currentWordId: null, currentDeadline: null },
    });

    return { isCorrect };
  }


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
    console.log(updated)

    if (updated.score > (session.user.score ?? 0)) {
      await this.prisma.users.update({
        where: { id: session.userId },
        data: { score: updated.score, bestLevel: session.level ?? null },
      });
    }


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


  async getResult(body: {
    score: number;
    userId: string;
    chatId?: string;
    messageId?: string;
    inline_messageId?: string;
  }) {
    try {
      const { score, userId, chatId, messageId, inline_messageId } = body;

      if (typeof score !== 'number' || typeof userId !== 'string') {
        throw new BadRequestException('Invalid score or userId');
      }

      // если есть чат — сохраняем лучший результат
      if (chatId) {
        const existing = await this.prisma.chatBest.findFirst({
          where: { chatId: String(chatId), userId: String(userId) },
        });

        if (!existing || existing.bestScore < score) {
          await this.prisma.chatBest.upsert({
            where: { chatId_userId: { chatId: String(chatId), userId: String(userId) } },
            update: { bestScore: score },
            create: { chatId: String(chatId), userId: String(userId), bestScore: score },
          });
        }
      }

      // отправляем результат в Telegram API
      const tgURL = new URL(`https://api.telegram.org/bot8368067329:AAGAUAGj6ZrJ9sQnxvUzeIS2OcFZDmMI7_U/setGameScore`);
      tgURL.searchParams.set('user_id', String(userId));
      tgURL.searchParams.set('score', String(score));



      if (inline_messageId) {
        tgURL.searchParams.set('inline_message_id', inline_messageId);
      } else if (chatId && messageId) {
        tgURL.searchParams.set('chat_id', String(chatId));
        tgURL.searchParams.set('message_id', String(messageId));
      } else {
        throw new BadRequestException('Need message identifiers');
      }

      const tgResp = await fetch(tgURL.toString()).then((r) => r.json());
      return { ok: true, tg: tgResp };
    } catch (e) {
      console.error(e);
      throw new BadRequestException('Server error');
    }
  }

  async getHighScores(query: {
    userId: string;
    chatId?: string;
    messageId?: string;
    inline_messageId?: string;
  }) {
    const tgURL = new URL(`https://api.telegram.org/bot${process.env.TG_BOT_TOKEN}/getGameHighScores`);
    tgURL.searchParams.set('user_id', String(query.userId));

    if (query.inline_messageId) {
      tgURL.searchParams.set('inline_message_id', query.inline_messageId);
    } else if (query.chatId && query.messageId) {
      tgURL.searchParams.set('chat_id', String(query.chatId));
      tgURL.searchParams.set('message_id', String(query.messageId));
    } else {
      throw new BadRequestException('Need message identifiers');
    }

    const resp = await fetch(tgURL.toString()).then(r => r.json());
    return resp;
  }

  private shuffle(arr: string[]) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  async getTgIdUsername(sessionId: string) {
    const findUs = await this.prisma.game_Session.findFirst({
      where: { id: sessionId },
      include: { user: true },
    });
    if (!findUs) throw new NotFoundException('Session not found');
    return { telegramId: findUs.user.telegramId, username: findUs.user.username };
  }
}
