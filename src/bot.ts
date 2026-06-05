import type { StorageAdapter } from 'grammy';
import { Bot, Context, InlineKeyboard, session } from 'grammy';
import type { SessionData } from './types';
import { config } from './config';

// ─── Context Type ────────────────────────────

export type BotContext = Context & {
  session: SessionData;
  webappUrl?: string;
};

// ─── Session Initial State ───────────────────

function initialSession(): SessionData {
  return {
    linkedAccount: null,
    cart: [],
    conv: { name: null, step: null, data: {} },
  };
}

// ─── Bot Factory ─────────────────────────────

export function createBot(sessionStorage: StorageAdapter<SessionData>): Bot<BotContext> {
  const bot = new Bot<BotContext>(config.botToken);

  bot.use(
    session({
      initial: initialSession,
      storage: sessionStorage,
    }),
  );

  // ─── Attach webappUrl to context ─────────
  bot.use(async (ctx, next) => {
    ctx.webappUrl = config.webappUrl;
    await next();
  });

  // ─── Import handlers (lazy to avoid circular) ──
  const { startHandler, linkHandler, unlinkHandler } = require('./handlers/start.handler');
  const { helpHandler, fallbackHandler } = require('./handlers/help.handler');
  const { statusHandler } = require('./handlers/status.handler');
  const { walletHandler, rewardsHandler } = require('./handlers/wallet.handler');
  const { reportHandler } = require('./handlers/report.handler');
  const { broadcastHandler } = require('./handlers/broadcast.handler');
  const { callbackQueryHandler } = require('./handlers/callback.handler');
  const { qrHandler, badgeHandler, eventsHandler } = require('./handlers/hub.handler');
  const { startDeposit } = require('./conversations/deposit.conv');
  const { showMenuCategories, showCart } = require('./conversations/create-order.conv');

  // ─── Commands ────────────────────────────
  bot.command('start', startHandler);
  bot.command('link', linkHandler);
  bot.command('unlink', unlinkHandler);
  bot.command('menu', (ctx: BotContext) => showMenuCategories(ctx));
  bot.command('cart', (ctx: BotContext) => showCart(ctx));
  bot.command('order', (ctx: BotContext) => showCart(ctx));   // goes to cart → checkout
  bot.command('status', statusHandler);
  bot.command('deposit', (ctx: BotContext) => startDeposit(ctx));
  bot.command('wallet', walletHandler);
  bot.command('rewards', rewardsHandler);
  bot.command('report', reportHandler);
  bot.command('broadcast', broadcastHandler);
  bot.command('help', helpHandler);
  bot.command('qr', (ctx: BotContext) => qrHandler(ctx));
  bot.command('badge', (ctx: BotContext) => badgeHandler(ctx));
  bot.command('events', (ctx: BotContext) => eventsHandler(ctx));

  // ─── Callback queries ────────────────────
  bot.on('callback_query:data', callbackQueryHandler);

  // ─── Mini App data (order placed via webapp) ──
  bot.on('message:web_app_data', async (ctx) => {
    try {
      const raw = ctx.message.web_app_data?.data;
      if (!raw) return;
      const payload = JSON.parse(raw) as {
        type: string;
        order_id?: number;
        receipt_number?: string;
        total?: number;
      };
      if (payload.type === 'order_placed') {
        const keyboard = new InlineKeyboard().text(
          '📋 Track Order',
          `order:track:${payload.order_id}`,
        );
        await ctx.reply(
          `✅ <b>Order Placed!</b>\n` +
            `📋 Receipt: <code>#${payload.receipt_number}</code>\n` +
            `💰 Total: ${Number(payload.total ?? 0).toFixed(0)} KHR\n\n` +
            `Use /status to track your order.`,
          { parse_mode: 'HTML', reply_markup: keyboard },
        );
      }
    } catch {
      await ctx.reply('✅ Order received!');
    }
  });

  // ─── Text messages — route active conversation ──
  bot.on('message:text', async (ctx) => {
    const { handleLinkAccountStep } = require('./conversations/link-account.conv');
    const { handleCreateOrderStep } = require('./conversations/create-order.conv');
    const { handleDepositStep } = require('./conversations/deposit.conv');

    const convName = ctx.session.conv.name;

    if (convName === 'linkAccount') {
      await handleLinkAccountStep(ctx);
    } else if (convName === 'createOrder') {
      await handleCreateOrderStep(ctx);
    } else if (convName === 'deposit') {
      await handleDepositStep(ctx);
    } else {
      await fallbackHandler(ctx);
    }
  });

  // ─── Error handler ───────────────────────
  bot.catch((err) => {
    const ctx = err.ctx;
    console.error(`[bot] Error while handling update ${ctx.update.update_id}:`, err.error);
    ctx.reply('⚠️ An unexpected error occurred. Please try again.').catch(() => null);
  });

  return bot;
}
