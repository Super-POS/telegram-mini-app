import type { BotContext } from '../bot';
import { InlineKeyboard } from 'grammy';

const CUSTOMER_URL = 'https://customer.navahub.org';
const EVENTS_URL = 'https://club54.navahub.org/events';

export async function miniappHandler(ctx: BotContext): Promise<void> {
  const kb = new InlineKeyboard().webApp('Open Mini App', CUSTOMER_URL);
  await ctx.reply('Open the customer portal to browse and place orders.', {
    reply_markup: kb,
  });
}

export async function qrHandler(ctx: BotContext): Promise<void> {
  const kb = new InlineKeyboard().webApp('Open QR Code', `${CUSTOMER_URL}/profile/qr`);
  await ctx.reply('Open your personal QR code for check-in or payment.', {
    reply_markup: kb,
  });
}

export async function badgeHandler(ctx: BotContext): Promise<void> {
  await ctx.reply('🚧 Badge Display — Coming Soon');
}

export async function eventsHandler(ctx: BotContext): Promise<void> {
  const kb = new InlineKeyboard().webApp('View Events', EVENTS_URL);
  await ctx.reply('Browse upcoming events and schedules.', {
    reply_markup: kb,
  });
}
