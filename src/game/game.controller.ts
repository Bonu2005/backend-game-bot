import {
  Controller,
  Post,
  Get,
  Body,
  Query,
} from '@nestjs/common';
import { GameService } from './game.service';
import { StartGameDto, SubmitAnswerDto } from './dto/create-game.dto';

@Controller('game')
export class GameController {
  constructor(private readonly gameService: GameService) {}

  // ▶️ старт игры (создание сессии, пока без уровня)
  @Post('start')
  async startGame(@Body() dto: StartGameDto) {
    return this.gameService.startGame(dto);
  }

  // 🎯 выбор уровня
  @Post('choose-level')
  async chooseLevel(
    @Query('session_id') sessionId: string,
    @Body('level') level: number,
  ) {
    return this.gameService.chooseLevel(sessionId, level);
  }

  // 🔤 получить следующее слово
  @Get('next-word')
  async getNextWord(@Query('session_id') sessionId: string) {
    return this.gameService.getNextWord(sessionId);
  }

  // ✅ отправить ответ
  @Post('submit-answer')
  async submitAnswer(@Body() dto: SubmitAnswerDto) {
    return this.gameService.submitAnswer(dto);
  }

  // 📊 результат игры
  @Get('result')
  async getResult(@Query('session_id') sessionId: string) {
    return this.gameService.getResult(sessionId);
  }

  // 🏆 лидерборд
  @Get('leaderboard')
  async getLeaderboard(@Query('level') level?: number) {
    return this.gameService.getLeaderboard(level);
  }
}
