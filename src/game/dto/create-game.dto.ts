export class StartGameDto {
  telegramId: string;
  username: string;
  level: number|null;
}

export class SubmitAnswerDto {
  session_id: string;
  word_id: string;
  selected: string;
  time_taken: number;
}
