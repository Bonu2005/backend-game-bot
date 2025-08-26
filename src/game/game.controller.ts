import { Body, Controller, Get, Post, Query } from '@nestjs/common';
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

  @Get('result')
  result(
    @Query('score') score: number,
    @Query('user_id') user_id: string,
    @Query('chat_id') chat_id?: string,
    @Query('message_id') message_id?: string,
    @Query('inline_message_id') inline_message_id?: string,
  ) {
    return this.gameService.getResult({
      score: score,
      user_id:user_id,
      chat_id: chat_id ? chat_id : undefined,
      message_id: message_id ? message_id : undefined,
      inline_message_id,
    });
  }



}
