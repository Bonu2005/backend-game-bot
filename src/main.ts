import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as TelegramBot from 'node-telegram-bot-api';
import * as crypto from 'crypto';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({
    origin: ['*'],
    methods: 'GET,PUT,PATCH,POST,DELETE',
    credentials: true,
  });

  const token = '8368067329:AAGAUAGj6ZrJ9sQnxvUzeIS2OcFZDmMI7_U';
  const bot = new TelegramBot(token, { polling: true });

  // функция для генерации виртуального chatId
  function generateFakeChatId(userId: string | number, peerId?: string | number) {
    const base = peerId ? `${userId}_${peerId}` : `${userId}`;
    return 'game_' + base
  }

  bot.on("callback_query", async (query: any) => {
    try {
      if (query.game_short_name === "english") {
        const telegramId = query.from.id.toString();
        const username = query.from.first_name || query.from.username;

        // Если игра шарится другу — можно подмешать его id (query.message?.chat?.id если доступен)
        const peerId = query.message?.chat?.id?.toString();

        // генерируем "виртуальный chatId"
        const fakeChatId = generateFakeChatId(telegramId, peerId);

        console.log(`Игрок: ${username} (${telegramId}), chatId: ${fakeChatId}`);

        await bot.answerCallbackQuery(query.id, {
          url: `https://game-bot-gules.vercel.app/?telegramId=${telegramId}&username=${encodeURIComponent(username)}&chatId=${fakeChatId}`,
        });

        console.log(
          `https://game-bot-gules.vercel.app/?telegramId=${telegramId}&username=${encodeURIComponent(username)}&chatId=${fakeChatId}`
        );
      }
    } catch (err) {
      console.error("Ошибка при обработке callback_query:", err);
    }
  });

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
