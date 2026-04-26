import type { BotContext } from '../bot';
import { notifier } from '../notifications/notifier';
import { customerStore } from '../notifications/customer-store';
import { config } from '../config';

function isAdmin(ctx: BotContext): boolean {
  const chatId = ctx.chat?.id;
  return chatId !== undefined && config.adminChatIds.includes(chatId);
}

export async function broadcastHandler(ctx: BotContext): Promise<void> {
  if (!isAdmin(ctx)) {
    await ctx.reply('🚫 This command is for admins only.', { parse_mode: 'HTML' });
    return;
  }

  // /broadcast <message>
  const message = (ctx.match as string | undefined)?.trim();

  if (!message) {
    await ctx.reply(
      '📢 <b>Broadcast Announcement</b>\n\n' +
        'Usage: <code>/broadcast Your announcement text here</code>\n\n' +
        'Supports HTML formatting: <b>bold</b>, <i>italic</i>, <code>code</code>',
      { parse_mode: 'HTML' },
    );
    return;
  }

  const chatIds = customerStore.getAllChatIds();

  if (!chatIds.length) {
    await ctx.reply('⚠️ No customers have linked their accounts yet.', {
      parse_mode: 'HTML',
    });
    return;
  }

  const loading = await ctx.reply(`⏳ Broadcasting to ${chatIds.length} customers…`);

  const announcement =
    `📢 <b>Announcement from CoffeeShop</b>\n──────────────────────\n${message}`;

  const { ok, fail } = await notifier.broadcast(chatIds, announcement);

  await ctx.api.deleteMessage(ctx.chat!.id, loading.message_id).catch(() => null);
  await ctx.reply(
    `✅ Broadcast complete!\n• Delivered: <b>${ok}</b>\n• Failed: <b>${fail}</b>`,
    { parse_mode: 'HTML' },
  );
}
