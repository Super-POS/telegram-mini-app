import type { BotContext } from '../bot';
import { InlineKeyboard } from 'grammy';
import { startLinkAccount } from '../conversations/link-account.conv';
import { alreadyLinked, errorMessage, telegramAutoWelcome } from '../templates/messages.template';
import { config } from '../config';
import { loginViaTelegramBot } from '../api/auth.api';
import { getCustomerProfile } from '../api/wallet.api';

function homeKeyboard(): InlineKeyboard {
  const keyboard = new InlineKeyboard().text('Browse Menu', 'cmd:menu').text('Wallet', 'cmd:wallet');
  if (config.webappUrlIsHttps) {
    keyboard.row().webApp('Open Mini App', config.webappUrl);
  }
  keyboard.row().text('Hub', 'hub:miniapp');
  keyboard.row().text('Link Existing Account', 'cmd:link').text('Help', 'cmd:help');
  return keyboard;
}

export async function startHandler(ctx: BotContext): Promise<void> {
  const from = ctx.from;
  if (!from || from.is_bot) {
    await ctx.reply(
      'Could not detect your Telegram account. Open this chat from your personal Telegram profile.',
    );
    return;
  }

  if (!config.telegramBotServerSecret) {
    await ctx.reply(
      'Sign-in is not configured. Set TELEGRAM_BOT_SERVER_SECRET to the same value in the bot env and the POS API env, then send /start again.',
    );
    return;
  }

  const loading = await ctx.reply('Signing you in...');

  console.log('[start] sign-in API_BASE_URL=%s telegram_user_id=%s', config.apiBaseUrl, from.id);

  try {
    const { token: accessToken } = await loginViaTelegramBot(from);

    let name =
      [from.first_name, from.last_name].filter(Boolean).join(' ').trim() ||
      (from.username ? `@${from.username}` : `Telegram #${from.id}`);
    let phone = `tg_${from.id}`;
    let customerId = 0;

    try {
      const profile = await getCustomerProfile(accessToken);
      if (profile) {
        name = String(profile.name ?? name);
        phone = String(profile.phone ?? phone);
        customerId = Number(profile.id ?? customerId);
      }
    } catch {
      /* profile optional */
    }

    ctx.session.linkedAccount = { accessToken, customerId, name, phone };

    await ctx.api.deleteMessage(ctx.chat!.id, loading.message_id).catch(() => null);

    await ctx.reply(telegramAutoWelcome(name), {
      parse_mode: 'HTML',
      reply_markup: homeKeyboard(),
    });
  } catch (err: unknown) {
    console.error('[start] sign-in failed', err instanceof Error ? err.stack ?? err.message : err);
    await ctx.api.deleteMessage(ctx.chat!.id, loading.message_id).catch(() => null);
    const msg = err instanceof Error ? err.message : 'Sign-in failed';
    await ctx.reply(errorMessage(msg), {
      parse_mode: 'HTML',
      reply_markup: new InlineKeyboard().text('Try again', 'cmd:start'),
    });
  }
}

export async function linkHandler(ctx: BotContext): Promise<void> {
  if (ctx.session.linkedAccount) {
    await ctx.reply(alreadyLinked(ctx.session.linkedAccount.name), {
      parse_mode: 'HTML',
    });
    return;
  }
  await startLinkAccount(ctx);
}

export async function unlinkHandler(ctx: BotContext): Promise<void> {
  if (!ctx.session.linkedAccount) {
    await ctx.reply('ℹ️ No account is currently linked.');
    return;
  }
  const name = ctx.session.linkedAccount.name;
  ctx.session.linkedAccount = null;
  ctx.session.cart = [];
  ctx.session.conv = { name: null, step: null, data: {} };
  await ctx.reply(`👋 Goodbye, <b>${name}</b>! Your account has been unlinked.\n\nSend /start to link again.`, {
    parse_mode: 'HTML',
  });
}
