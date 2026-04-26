import type { BotContext } from '../bot';
import { InlineKeyboard } from 'grammy';
import { helpMessage } from '../templates/messages.template';
import { config } from '../config';

export async function helpHandler(ctx: BotContext): Promise<void> {
  const keyboard = new InlineKeyboard()
    .text('🛒 Menu', 'cmd:menu')
    .text('📦 My Orders', 'cmd:status')
    .row()
    .text('💰 Wallet', 'cmd:wallet')
    .text('💳 Deposit', 'cmd:deposit');

  if (config.webappUrlIsHttps) {
    keyboard.row().webApp('🌐 Open Mini App', config.webappUrl);
  }

  await ctx.reply(helpMessage(), {
    parse_mode: 'HTML',
    reply_markup: keyboard,
  });
}

export async function fallbackHandler(ctx: BotContext): Promise<void> {
  await ctx.reply(
    "🤔 I didn't understand that.\n\nType /help to see all available commands.",
    { parse_mode: 'HTML' },
  );
}
