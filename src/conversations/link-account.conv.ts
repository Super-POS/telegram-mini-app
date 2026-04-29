/**
 * Account-linking conversation.
 *
 * Steps:
 *   ask_phone   → user sends phone/username
 *   ask_password → user sends password → call login API → done
 *
 * Session conv.name = 'linkAccount'
 */

import type { BotContext } from '../bot';
import { login } from '../api/auth.api';
import { getCustomerProfile } from '../api/wallet.api';
import { config } from '../config';
import { InlineKeyboard } from 'grammy';
import { welcomeNewUser, errorMessage } from '../templates/messages.template';

// ─── Entry Point ────────────────────────────

export async function startLinkAccount(ctx: BotContext): Promise<void> {
  ctx.session.conv = { name: 'linkAccount', step: 'ask_phone', data: {} };

  await ctx.reply(
    '🔐 <b>Link Your POS Account</b>\n\n' +
      'Please enter your registered phone number or username:',
    { parse_mode: 'HTML' },
  );
}

// ─── Step Handler ────────────────────────────

export async function handleLinkAccountStep(ctx: BotContext): Promise<void> {
  const text = ctx.message?.text?.trim();
  if (!text) return;

  const { step, data } = ctx.session.conv;

  if (step === 'ask_phone') {
    ctx.session.conv.data = { ...data, username: text };
    ctx.session.conv.step = 'ask_password';

    await ctx.reply('🔑 Now enter your password:', { parse_mode: 'HTML' });
    return;
  }

  if (step === 'ask_password') {
    const username = data.username as string;
    ctx.session.conv = { name: null, step: null, data: {} }; // clear before API call

    const loadingMsg = await ctx.reply('⏳ Verifying your account…', {
      parse_mode: 'HTML',
    });

    try {
      const result = await login(username, text);
      const accessToken = result.access_token;

      // Fetch profile to get user details (login response may not include them)
      let name: string = result.user?.name ?? username;
      let phone: string = result.user?.phone ?? username;
      let customerId: number = result.user?.id ?? 0;

      try {
        const profile = await getCustomerProfile(accessToken);
        if (profile) {
          name = String(profile.name ?? name);
          phone = String(profile.phone ?? phone);
          customerId = Number(profile.id ?? customerId);
        }
      } catch {
        // Profile fetch failed — use whatever login returned
      }

      ctx.session.linkedAccount = { accessToken, customerId, name, phone };

      await ctx.api.deleteMessage(ctx.chat!.id, loadingMsg.message_id).catch(() => null);

      const keyboard = new InlineKeyboard()
        .text('📦 My Orders', 'cmd:status')
        .text('💰 Wallet', 'cmd:wallet');

      if (config.webappUrlIsHttps) {
        keyboard.row().webApp('Browse Menu & Order', config.webappUrl);
      } else {
        keyboard.row().text('🛒 Browse Menu', 'cmd:menu');
      }

      await ctx.reply(welcomeNewUser(name), {
        parse_mode: 'HTML',
        reply_markup: keyboard,
      });
    } catch (err: unknown) {
      await ctx.api.deleteMessage(ctx.chat!.id, loadingMsg.message_id).catch(() => null);
      const msg = err instanceof Error ? err.message : 'Login failed';
      await ctx.reply(errorMessage(msg), {
        parse_mode: 'HTML',
        reply_markup: new InlineKeyboard().text('🔄 Try Again', 'cmd:link'),
      });
    }
    return;
  }
}
