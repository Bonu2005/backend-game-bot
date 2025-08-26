
import { Injectable, OnModuleInit } from '@nestjs/common';
import { Telegraf, Markup } from 'telegraf';

const BOT_TOKEN = process.env.BOT_TOKEN || '8368067329:AAGAUAGj6ZrJ9sQnxvUzeIS2OcFZDmMI7_U';
const GAME_SHORT_NAME = 'english';
const GAME_ORIGIN = 'https://game-bot-gules.vercel.app/';

@Injectable()
export class BotService implements OnModuleInit {
  private bot: Telegraf;

  onModuleInit() {
    this.bot = new Telegraf(BOT_TOKEN);

    // Команда /play
    this.bot.command('play', async (ctx) => {
      await ctx.telegram.sendGame(
        ctx.chat.id,
        GAME_SHORT_NAME,
        Markup.inlineKeyboard([
          [Markup.button.game('▶️ Play')],
          [Markup.button.url('📜 Rules', `${GAME_ORIGIN}/rules`)],
        ])
      );
    });

    // Обработка Play
    this.bot.on('callback_query', async (ctx) => {
      const cq = ctx.callbackQuery;
      if ('game_short_name' in cq && cq.game_short_name === GAME_SHORT_NAME) {
        const url = new URL('/', GAME_ORIGIN);
        url.searchParams.set('user_id', String(cq.from.id));
        url.searchParams.set('username', String(cq.from.first_name));
        if (cq.message?.chat?.id) url.searchParams.set('chat_id', String(cq.message.chat.id));
        if (cq.message?.message_id) url.searchParams.set('message_id', String(cq.message.message_id));
        if (cq.inline_message_id) url.searchParams.set('inline_message_id', cq.inline_message_id);

        await ctx.answerGameQuery(url.toString());
      } else {
        await ctx.answerCbQuery('Unknown game.');
      }
    });

    // Inline режим
    this.bot.on('inline_query', async (ctx) => {
      await ctx.answerInlineQuery(
        [
          {
            type: 'game',
            id: '0',
            game_short_name: GAME_SHORT_NAME,
          },
        ],
        { cache_time: 0 }
      );
    });

    // Запуск бота
    this.bot.launch()
      .then(() => console.log('Bot started'))
      .catch((err) => console.error('Bot failed to start', err));
  }
}

