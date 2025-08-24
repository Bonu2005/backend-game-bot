// dto/create-game.dto.ts
export class StartGameDto {
  telegramId!: string; // ты уже перевёл на string в схеме
  username!: string;
}

export class SubmitAnswerDto {
  session_id!: string;
  word_id!: string;
  selected!: string;
  time_taken!: number; // сек, присылает фронт; бэкенд всё равно режет по дедлайну
}
