import type { BotContext } from '../bot';
import { InlineKeyboard } from 'grammy';
import { login } from '../api/auth.api';
import { getDashboardSummary, getFinancialReport } from '../api/admin.api';
import {
  dashboardSummary,
  monthlyReport,
  errorMessage,
} from '../templates/messages.template';
import { config } from '../config';

function isAdmin(ctx: BotContext): boolean {
  const chatId = ctx.chat?.id;
  return chatId !== undefined && config.adminChatIds.includes(chatId);
}

async function getAdminToken(): Promise<string> {
  const result = await login(config.adminUsername, config.adminPassword);
  return result.access_token;
}

export async function reportHandler(ctx: BotContext): Promise<void> {
  if (!isAdmin(ctx)) {
    await ctx.reply('🚫 This command is for admins only.', { parse_mode: 'HTML' });
    return;
  }

  const keyboard = new InlineKeyboard()
    .text('📅 This Month', 'report:thisMonth')
    .text('📆 This Week', 'report:thisWeek')
    .row()
    .text('📊 Dashboard', 'report:dashboard');

  await ctx.reply('📊 <b>Reports</b>\n\nSelect a report to view:', {
    parse_mode: 'HTML',
    reply_markup: keyboard,
  });
}

export async function handleReportCallback(
  ctx: BotContext,
  type: string,
): Promise<void> {
  if (!isAdmin(ctx)) {
    await ctx.answerCallbackQuery('Admin only');
    return;
  }

  await ctx.answerCallbackQuery();
  const loading = await ctx.reply('⏳ Generating report…');

  try {
    const token = await getAdminToken();

    if (type === 'dashboard') {
      const summary = await getDashboardSummary(token);
      await ctx.api.deleteMessage(ctx.chat!.id, loading.message_id).catch(() => null);
      await ctx.reply(dashboardSummary(summary), { parse_mode: 'HTML' });
      return;
    }

    const now = new Date();
    let label: string;
    let report;

    if (type === 'thisMonth') {
      label = now.toLocaleString('default', { month: 'long', year: 'numeric' });
      report = await getFinancialReport(token, { thisMonth: 1, granularity: 'daily' });
    } else {
      label = `Week of ${now.toLocaleDateString()}`;
      report = await getFinancialReport(token, { thisWeek: 1, granularity: 'daily' });
    }

    await ctx.api.deleteMessage(ctx.chat!.id, loading.message_id).catch(() => null);
    await ctx.reply(monthlyReport(report, label), { parse_mode: 'HTML' });
  } catch (err: unknown) {
    await ctx.api.deleteMessage(ctx.chat!.id, loading.message_id).catch(() => null);
    const msg = err instanceof Error ? err.message : undefined;
    await ctx.reply(errorMessage(msg), { parse_mode: 'HTML' });
  }
}
