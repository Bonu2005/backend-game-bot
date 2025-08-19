import { PartialType } from '@nestjs/mapped-types';
import { StartGameDto,SubmitAnswerDto } from './create-game.dto';

export class UpdateGameDto extends PartialType(StartGameDto) {}
