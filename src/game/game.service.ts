import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { StartGameDto, SubmitAnswerDto } from './dto/create-game.dto';

@Injectable()
export class GameService {
  constructor(private prisma: PrismaService) {}

  async startGame(dto: StartGameDto) {
    const { telegramId, username } = dto;

    let user = await this.prisma.users.findUnique({ where: { telegramId } });
    if (!user) {
      user = await this.prisma.users.create({
        data: { telegramId, username, score: 0 },
      });
    }
console.log(user);

    const session = await this.prisma.game_Session.create({
      data: {
        userId: user.id,
        level: null,
      },
    });

    return {
      session_id: session.id,
      duration: session.duration,
      message: 'Game session created. Please choose level.',
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
    const session = await this.prisma.game_Session.findUnique({
      where: { id: sessionId },
      include: { answers: true },
    });

    if (!session) throw new NotFoundException('Session not found');
    if (!session.level) throw new BadRequestException('Level not selected yet');

    const isExpired = Date.now() - session.start_time.getTime() > session.duration * 1000;
    if (isExpired) {
      await this.endGame(sessionId);
      return { message: 'Game ended by timer' };
    }

    const usedWordIds = session.answers.map((a) => a.wordId);

    const word = await this.prisma.words.findFirst({
      where: { level: session.level, id: { notIn: usedWordIds } },
    });

    if (!word) return { message: 'No more words available' };

    const options = this.shuffle([
      word.correct_uz,
      word.wrong_1,
      word.wrong_2,
      word.wrong_3,
    ]);

    const timeLeft =
      session.duration -
      Math.floor((Date.now() - session.start_time.getTime()) / 1000);

    return {
      word_id: word.id,
      word_en: word.word_en,
      options,
      time_left: timeLeft > 0 ? timeLeft : 0,
    };
  }


  async submitAnswer(dto: SubmitAnswerDto) {
    const { session_id, word_id, selected, time_taken } = dto;

    const session = await this.prisma.game_Session.findUnique({
      where: { id: session_id },
    });

    if (!session) throw new NotFoundException('Session not found');

    const isExpired = Date.now() - session.start_time.getTime() > session.duration * 1000;
    if (isExpired) {
      await this.endGame(session_id);
      return { message: 'Game ended by timer' };
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
      },
    });

    if (isCorrect) {
      await this.prisma.game_Session.update({
        where: { id: session_id },
        data: { score: { increment: 1 } },
      });
    }

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
      data: { end_time: new Date() },
    });

    await this.prisma.users.update({
      where: { id: session.userId },
      data: { score: { increment: updated.score } },
    });
  }


  async getResult(sessionId: string) {
    const session = await this.prisma.game_Session.findUnique({
      where: { id: sessionId },
      include: { answers: true },
    });

    if (!session) throw new NotFoundException('Session not found');

    return {
      total_score: session.score,
      total_answers: session.answers.length,
      ended_at: session.end_time,
    };
  }


  async getLeaderboard(level?: number) {
    if (level) {
      const sessions = await this.prisma.game_Session.findMany({
        where: { level },
        orderBy: { score: 'desc' },
        include: { user: true },
      });

      return sessions.map((s) => ({
        username: s.user.username,
        score: s.score,
        level: s.level,
      }));
    }

    const users = await this.prisma.users.findMany({
      orderBy: { score: 'desc' },
    });

    return users.map((u) => ({
      username: u.username,
      score: u.score,
    }));
  }

  
  private shuffle(arr: string[]) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }
}
