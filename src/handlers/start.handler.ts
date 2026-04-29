import type { BotContext } from '../bot';
import { InlineKeyboard } from 'grammy';
import { startLinkAccount } from '../conversations/link-account.conv';
import { alreadyLinked, welcomeNewUser } from '../templates/messages.template';
import { config } from '../config';

export async function startHandler(ctx: BotContext): Promise<void> {
  const account = ctx.session.linkedAccount;

  if (account) {
    const keyboard = new InlineKeyboard()
      .text('Browse Menu', 'cmd:menu')
      .text('Wallet', 'cmd:wallet');

    if (config.webappUrlIsHttps) {
      keyboard.row().webApp('Open Mini App', config.webappUrl);
    }

    await ctx.reply(alreadyLinked(account.name), {
      parse_mode: 'HTML',
      reply_markup: keyboard,
    });
    return;
  }

  const keyboard = new InlineKeyboard();
  if (config.webappUrlIsHttps) {
    keyboard.webApp('Open Mini App', config.webappUrl).row();
  }
  keyboard.text('Link Existing Account', 'cmd:link').row().text('Help', 'cmd:help');

  const intro = config.webappUrlIsHttps
    ? '<b>Welcome to CoffeeShop Bot!</b>\n\nOpen the Mini App to browse the image menu, order, and manage your wallet.'
    : '<b>Welcome to CoffeeShop Bot!</b>\n\nOrder your favourite coffee, track orders, and manage your wallet from Telegram.\n\nGet started by linking your POS account:';

  await ctx.reply(intro, { parse_mode: 'HTML', reply_markup: keyboard });
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
