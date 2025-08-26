import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { GameService } from './game.service';
import { StartGameDto, SubmitAnswerDto } from './dto/create-game.dto';

@Controller('game')
export class GameController {
  constructor(private readonly gameService: GameService) { }

  @Post('start')
  start(@Body() dto: StartGameDto, @Query('chatId') chatId?: string) {
    return this.gameService.startGame(dto);
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

  @Post('result')
  result(@Body() body: { score: number; userId: string; chatId?: string; messageId?: string; inline_messageId?: string }) {
    return this.gameService.getResult(body);
  }


  @Get('top')
  getTopPlayers() {
    return this.gameService.getTopPlayers();
  }

  @Get('by/:sessionId')
  async getResult(@Param('sessionId') sessionId: string) {
    return this.gameService.getBy(sessionId);
  }



}
