import type { BotContext } from '../bot';
import { InlineKeyboard } from 'grammy';
import { getOrder, getOrderHistory } from '../api/order.api';
import { orderReceipt, notLinkedMessage, errorMessage } from '../templates/messages.template';

export async function statusHandler(ctx: BotContext): Promise<void> {
  if (!ctx.session.linkedAccount) {
    await ctx.reply(notLinkedMessage(), { parse_mode: 'HTML' });
    return;
  }

  const args = ctx.match as string | undefined;
  const orderId = args ? parseInt(args, 10) : NaN;

  if (!isNaN(orderId)) {
    await trackOrder(ctx, orderId);
    return;
  }

  // Show recent orders
  const loading = await ctx.reply('⏳ Loading your orders…');
  try {
    const orders = await getOrderHistory(ctx.session.linkedAccount.accessToken, 1, 5);
    await ctx.api.deleteMessage(ctx.chat!.id, loading.message_id).catch(() => null);

    if (!orders.length) {
      await ctx.reply("📭 You don't have any orders yet.\n\nUse /menu to start ordering!", {
        parse_mode: 'HTML',
      });
      return;
    }

    const keyboard = new InlineKeyboard();
    orders.forEach((o) => {
      const statusIcon =
        o.status === 'completed' ? '✅' :
        o.status === 'cancelled' ? '❌' :
        o.status === 'ready' ? '🔔' : '⏳';
      keyboard
        .text(`${statusIcon} #${o.receipt_number} — $${o.total_amount.toFixed(2)}`, `order:track:${o.id}`)
        .row();
    });

    await ctx.reply('📦 <b>Your Recent Orders</b>\n\nTap an order to track it:', {
      parse_mode: 'HTML',
      reply_markup: keyboard,
    });
  } catch (err: unknown) {
    await ctx.api.deleteMessage(ctx.chat!.id, loading.message_id).catch(() => null);
    const msg = err instanceof Error ? err.message : undefined;
    await ctx.reply(errorMessage(msg), { parse_mode: 'HTML' });
  }
}

export async function trackOrder(ctx: BotContext, orderId: number): Promise<void> {
  if (!ctx.session.linkedAccount) return;

  try {
    const order = await getOrder(ctx.session.linkedAccount.accessToken, orderId);
    const keyboard = new InlineKeyboard()
      .text('🔄 Refresh', `order:track:${orderId}`)
      .text('📦 All Orders', 'cmd:status');

    await ctx.reply(orderReceipt(order), {
      parse_mode: 'HTML',
      reply_markup: keyboard,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : undefined;
    await ctx.reply(errorMessage(msg), { parse_mode: 'HTML' });
  }
}
