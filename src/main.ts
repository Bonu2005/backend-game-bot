import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as TelegramBot from 'node-telegram-bot-api';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({
    origin: ['*'],
    methods: 'GET,PUT,PATCH,POST,DELETE',
    credentials: true,
  });

  const token = '8368067329:AAGAUAGj6ZrJ9sQnxvUzeIS2OcFZDmMI7_U';
  const bot = new TelegramBot(token, { polling: true });

  bot.on("callback_query", async (query: any) => {
    try {
      if (query.game_short_name === "english") {
        const telegramId = query.from.id;
        const username = query.from.first_name || query.from.username;

        console.log(`Игрок: ${username} (${telegramId})`);


        await bot.answerCallbackQuery(query.id, {
          url: `https://game-bot-gules.vercel.app/?telegramId=${telegramId}&username=${encodeURIComponent(username)}`,
        });
        console.log(`https://game-bot-gules.vercel.app/?telegramId=${telegramId}&username=${encodeURIComponent(username)}`,);


      }
    } catch (err) {
      console.error("Ошибка при обработке callback_query:", err);
    }
  });

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
