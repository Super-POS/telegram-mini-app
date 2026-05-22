import type { Bot } from 'grammy';
import { createBot } from './bot';
import type { BotContext } from './bot';
import { createSessionStorage } from './storage/session-storage.factory';

let bot: Bot<BotContext> | null = null;

/** Shared bot instance for Vercel serverless (webhook). */
export function getBot(): Bot<BotContext> {
  if (!bot) {
    bot = createBot(createSessionStorage());
  }
  return bot;
}
