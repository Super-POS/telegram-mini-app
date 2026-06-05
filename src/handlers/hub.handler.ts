import type { BotContext } from '../bot';
import { InlineKeyboard } from 'grammy';
import { getRewards } from '../api/wallet.api';
import { startBadgeConversation } from '../conversations/badge.conv';
import { badgeDisplay, notLinkedMessage, errorMessage } from '../templates/messages.template';


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
  if (!ctx.session.linkedAccount) {
    await ctx.reply(notLinkedMessage(), { parse_mode: 'HTML' });
    return;
  }

  const loading = await ctx.reply('⏳ Checking your badge…');

  try {
    const rewards = await getRewards(ctx.session.linkedAccount.accessToken);
    await ctx.api.deleteMessage(ctx.chat!.id, loading.message_id).catch(() => null);

    if (rewards.badge) {
      await ctx.reply(badgeDisplay(rewards.badge as string, rewards.rank_tier), { parse_mode: 'HTML' });
    } else {
      await ctx.reply(
        '🏅 <b>Badge Display</b>\n\nYou don\'t have a badge yet!\n\nAnswer a few quick questions and our AI will generate your unique badge. Ready?',
        { parse_mode: 'HTML' },
      );
      await startBadgeConversation(ctx);
    }
  } catch (err: unknown) {
    await ctx.api.deleteMessage(ctx.chat!.id, loading.message_id).catch(() => null);
    const msg = err instanceof Error ? err.message : undefined;
    await ctx.reply(errorMessage(msg), { parse_mode: 'HTML' });
  }
}

export async function eventsHandler(ctx: BotContext): Promise<void> {
  const kb = new InlineKeyboard().webApp('View Events', EVENTS_URL);
  await ctx.reply('Browse upcoming events and schedules.', {
    reply_markup: kb,
  });
}
