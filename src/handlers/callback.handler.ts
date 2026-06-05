import type { BotContext } from '../bot';
import { startLinkAccount } from '../conversations/link-account.conv';
import {
  showMenuCategories,
  showCategoryItems,
  askItemQuantity,
  showCart,
  showCheckout,
  confirmAndPlaceOrder,
} from '../conversations/create-order.conv';
import { startDeposit } from '../conversations/deposit.conv';
import { walletHandler, walletHistoryHandler, rewardsHandler } from './wallet.handler';
import { statusHandler, trackOrder } from './status.handler';
import { helpHandler } from './help.handler';
import { handleReportCallback } from './report.handler';
import { startHandler } from './start.handler';

export async function callbackQueryHandler(ctx: BotContext): Promise<void> {
  const data = ctx.callbackQuery?.data;
  if (!data) return;

  // ─── Simple commands ─────────────────────

  if (data === 'cmd:start') {
    await ctx.answerCallbackQuery();
    await startHandler(ctx);
    return;
  }

  if (data === 'cmd:menu') {
    await ctx.answerCallbackQuery();
    await showMenuCategories(ctx);
    return;
  }

  if (data === 'cmd:link') {
    await ctx.answerCallbackQuery();
    await startLinkAccount(ctx);
    return;
  }

  if (data === 'cmd:cart') {
    await ctx.answerCallbackQuery();
    await showCart(ctx);
    return;
  }

  if (data === 'cmd:checkout') {
    await showCheckout(ctx);
    return;
  }

  if (data === 'cmd:confirm_order') {
    await confirmAndPlaceOrder(ctx);
    return;
  }

  if (data === 'cmd:clear_cart') {
    ctx.session.cart = [];
    await ctx.answerCallbackQuery('Cart cleared');
    await ctx.editMessageText('🛒 Cart cleared.\n\nUse /menu to browse items.', {
      parse_mode: 'HTML',
    });
    return;
  }

  if (data === 'cmd:deposit') {
    await ctx.answerCallbackQuery();
    await startDeposit(ctx);
    return;
  }

  if (data === 'cmd:wallet') {
    await ctx.answerCallbackQuery();
    await walletHandler(ctx);
    return;
  }

  if (data === 'cmd:wallet_history') {
    await ctx.answerCallbackQuery();
    await walletHistoryHandler(ctx);
    return;
  }

  if (data === 'cmd:rewards') {
    await ctx.answerCallbackQuery();
    await rewardsHandler(ctx);
    return;
  }

  if (data === 'cmd:status') {
    await ctx.answerCallbackQuery();
    await statusHandler(ctx);
    return;
  }

  if (data === 'cmd:help') {
    await ctx.answerCallbackQuery();
    await helpHandler(ctx);
    return;
  }

  // ─── Parameterised callbacks ──────────────

  // Category selection: cat:123
  const catMatch = data.match(/^cat:(\d+)$/);
  if (catMatch) {
    await showCategoryItems(ctx, parseInt(catMatch[1], 10));
    return;
  }

  // Item selection: item:123
  const itemMatch = data.match(/^item:(\d+)$/);
  if (itemMatch) {
    await askItemQuantity(ctx, parseInt(itemMatch[1], 10));
    return;
  }

  // Order tracking: order:track:123
  const trackMatch = data.match(/^order:track:(\d+)$/);
  if (trackMatch) {
    await ctx.answerCallbackQuery();
    await trackOrder(ctx, parseInt(trackMatch[1], 10));
    return;
  }

  // Report callbacks: report:thisMonth, report:thisWeek, report:dashboard
  const reportMatch = data.match(/^report:(.+)$/);
  if (reportMatch) {
    await handleReportCallback(ctx, reportMatch[1]);
    return;
  }

  await ctx.answerCallbackQuery();
}
