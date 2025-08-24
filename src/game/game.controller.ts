import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { GameService } from './game.service';
import { StartGameDto, SubmitAnswerDto } from './dto/create-game.dto';

@Controller('game')
export class GameController {
  constructor(private readonly gameService: GameService) {}

  @Post('start')
  start(@Body() dto: StartGameDto, @Query('chatId') chatId?: string) {
    return this.gameService.startGame(dto, chatId || undefined);
  }

  @Post('choose-level')
  chooseLevel(@Query('sessionId') sessionId: string, @Query('level') level: string) {
    return this.gameService.chooseLevel(sessionId, Number(level));
  }

  @Get('next-word')
  getNext(@Query('sessionId') sessionId: string) {
    return this.gameService.getNextWord(sessionId);
  }

  @Post('submit')
  submit(@Body() dto: SubmitAnswerDto) {
    return this.gameService.submitAnswer(dto);
  }

  @Get('result')
  result(@Query('sessionId') sessionId: string) {
    return this.gameService.getResult(sessionId);
  }

  // Лидерборды
  @Get('leaderboard/global')
  globalLb() {
    return this.gameService.getGlobalLeaderboard();
  }

  @Get('leaderboard/chat')
  chatLb(@Query('chatId') chatId: string) {
    return this.gameService.getChatLeaderboard(chatId);
  }
}
