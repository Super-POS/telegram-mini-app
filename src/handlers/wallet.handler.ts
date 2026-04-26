import type { BotContext } from '../bot';
import { InlineKeyboard } from 'grammy';
import { getWalletBalance, getWalletHistory, getRewards } from '../api/wallet.api';
import {
  walletBalance,
  rewardProfile,
  notLinkedMessage,
  errorMessage,
} from '../templates/messages.template';

export async function walletHandler(ctx: BotContext): Promise<void> {
  if (!ctx.session.linkedAccount) {
    await ctx.reply(notLinkedMessage(), { parse_mode: 'HTML' });
    return;
  }

  const loading = await ctx.reply('⏳ Loading wallet…');
  try {
    const [wallet, rewards] = await Promise.all([
      getWalletBalance(ctx.session.linkedAccount.accessToken),
      getRewards(ctx.session.linkedAccount.accessToken),
    ]);

    await ctx.api.deleteMessage(ctx.chat!.id, loading.message_id).catch(() => null);

    const keyboard = new InlineKeyboard()
      .text('💳 Request Deposit', 'cmd:deposit')
      .text('⭐ Rewards', 'cmd:rewards')
      .row()
      .text('📜 History', 'cmd:wallet_history');

    await ctx.reply(
      walletBalance(wallet) + '\n\n' + rewardProfile(rewards),
      { parse_mode: 'HTML', reply_markup: keyboard },
    );
  } catch (err: unknown) {
    await ctx.api.deleteMessage(ctx.chat!.id, loading.message_id).catch(() => null);
    const msg = err instanceof Error ? err.message : undefined;
    await ctx.reply(errorMessage(msg), { parse_mode: 'HTML' });
  }
}

export async function rewardsHandler(ctx: BotContext): Promise<void> {
  if (!ctx.session.linkedAccount) {
    await ctx.reply(notLinkedMessage(), { parse_mode: 'HTML' });
    return;
  }

  try {
    const rewards = await getRewards(ctx.session.linkedAccount.accessToken);
    await ctx.reply(rewardProfile(rewards), { parse_mode: 'HTML' });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : undefined;
    await ctx.reply(errorMessage(msg), { parse_mode: 'HTML' });
  }
}

export async function walletHistoryHandler(ctx: BotContext): Promise<void> {
  if (!ctx.session.linkedAccount) {
    await ctx.reply(notLinkedMessage(), { parse_mode: 'HTML' });
    return;
  }

  try {
    const history = (await getWalletHistory(ctx.session.linkedAccount.accessToken)) as any[];
    if (!history?.length) {
      await ctx.reply('📭 No wallet transactions yet.', { parse_mode: 'HTML' });
      return;
    }

    const lines = history
      .slice(0, 10)
      .map(
        (t: any) =>
          `• ${t.type === 'credit' ? '➕' : '➖'} $${parseFloat(t.amount).toFixed(2)} — ${t.note ?? t.type}`,
      )
      .join('\n');

    await ctx.reply(`📜 <b>Wallet History</b>\n──────────────────────\n${lines}`, {
      parse_mode: 'HTML',
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : undefined;
    await ctx.reply(errorMessage(msg), { parse_mode: 'HTML' });
  }
}
