/**
 * Deposit-request conversation.
 *
 * Steps:
 *   ask_amount    → user sends amount
 *   ask_reference → user sends bank transfer reference
 *   ask_note      → user sends note or 'skip'
 *   → call API → show confirmation
 */

import type { BotContext } from '../bot';
import { InlineKeyboard } from 'grammy';
import { getWalletBalance, requestDeposit } from '../api/wallet.api';
import {
  walletBalance,
  depositConfirmation,
  errorMessage,
  notLinkedMessage,
} from '../templates/messages.template';

// ─── Entry Point ─────────────────────────────

export async function startDeposit(ctx: BotContext): Promise<void> {
  if (!ctx.session.linkedAccount) {
    await ctx.reply(notLinkedMessage(), { parse_mode: 'HTML' });
    return;
  }

  try {
    const wallet = await getWalletBalance(ctx.session.linkedAccount.accessToken);
    ctx.session.conv = { name: 'deposit', step: 'ask_amount', data: {} };

    await ctx.reply(
      walletBalance(wallet) +
        '\n\n💳 <b>Request a Deposit</b>\n\nHow much would you like to top up?\n(Enter amount, e.g. <code>50</code>)',
      { parse_mode: 'HTML' },
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : undefined;
    await ctx.reply(errorMessage(msg), { parse_mode: 'HTML' });
  }
}

// ─── Step Handler ─────────────────────────────

export async function handleDepositStep(ctx: BotContext): Promise<void> {
  const text = ctx.message?.text?.trim();
  if (!text) return;

  const { step, data } = ctx.session.conv;

  if (step === 'ask_amount') {
    const amount = parseFloat(text);
    if (isNaN(amount) || amount <= 0) {
      await ctx.reply('⚠️ Please enter a valid amount greater than 0.');
      return;
    }

    ctx.session.conv.data = { ...data, amount };
    ctx.session.conv.step = 'ask_reference';

    await ctx.reply(
      `💰 Amount: <b>$${amount.toFixed(2)}</b>\n\n` +
        '📎 Please provide the bank transfer reference number\n' +
        '(e.g. <code>TRF-2026-001</code>):',
      { parse_mode: 'HTML' },
    );
    return;
  }

  if (step === 'ask_reference') {
    if (text.length < 3) {
      await ctx.reply('⚠️ Reference must be at least 3 characters.');
      return;
    }

    ctx.session.conv.data = { ...data, reference: text };
    ctx.session.conv.step = 'ask_note';

    await ctx.reply(
      '📝 Any notes? (e.g. bank name, account)\n\nType <code>skip</code> to skip.',
      { parse_mode: 'HTML' },
    );
    return;
  }

  if (step === 'ask_note') {
    const note = text.toLowerCase() === 'skip' ? undefined : text;
    const { amount, reference } = data as { amount: number; reference: string };

    ctx.session.conv = { name: null, step: null, data: {} };

    if (!ctx.session.linkedAccount) {
      await ctx.reply(notLinkedMessage(), { parse_mode: 'HTML' });
      return;
    }

    const loadingMsg = await ctx.reply('⏳ Submitting your deposit request…');

    try {
      const deposit = await requestDeposit(ctx.session.linkedAccount.accessToken, {
        amount,
        reference,
        note,
      });

      await ctx.api.deleteMessage(ctx.chat!.id, loadingMsg.message_id).catch(() => null);

      const keyboard = new InlineKeyboard()
        .text('💰 Check Balance', 'cmd:wallet')
        .text('🛒 Browse Menu', 'cmd:menu');

      await ctx.reply(depositConfirmation(deposit), {
        parse_mode: 'HTML',
        reply_markup: keyboard,
      });
    } catch (err: unknown) {
      await ctx.api.deleteMessage(ctx.chat!.id, loadingMsg.message_id).catch(() => null);
      const msg = err instanceof Error ? err.message : undefined;
      await ctx.reply(errorMessage(msg), {
        parse_mode: 'HTML',
        reply_markup: new InlineKeyboard().text('🔄 Try Again', 'cmd:deposit'),
      });
    }
  }
}
