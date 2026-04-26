/**
 * Notification sender — called by:
 *  1. The Express webhook when api-v1 pushes a notification
 *  2. Scheduled tasks (monthly report)
 *
 * Usage:
 *   import { notifier } from './notifications/notifier';
 *   notifier.setBot(bot);
 *   await notifier.sendOrderUpdate(payload);
 */

import type { Bot } from 'grammy';
import type { BotContext } from '../bot';
import type {
  OrderNotificationPayload,
  PaymentNotificationPayload,
  RewardNotificationPayload,
  FinancialReport,
} from '../types';
import {
  orderStatusNotification,
  paymentStatusNotification,
  rewardUpdateNotification,
  monthlyReport,
} from '../templates/messages.template';

class Notifier {
  private bot: Bot<BotContext> | null = null;

  setBot(bot: Bot<BotContext>): void {
    this.bot = bot;
  }

  private async send(chatId: number, text: string): Promise<void> {
    if (!this.bot) throw new Error('Bot not initialised in notifier');
    await this.bot.api.sendMessage(chatId, text, { parse_mode: 'HTML' });
  }

  // ─── Order Status ──────────────────────────

  async sendOrderUpdate(payload: OrderNotificationPayload): Promise<void> {
    await this.send(
      payload.telegram_chat_id,
      orderStatusNotification(payload),
    );
  }

  // ─── Payment Status ────────────────────────

  async sendPaymentUpdate(payload: PaymentNotificationPayload): Promise<void> {
    await this.send(
      payload.telegram_chat_id,
      paymentStatusNotification(payload),
    );
  }

  // ─── Reward Update ─────────────────────────

  async sendRewardUpdate(payload: RewardNotificationPayload): Promise<void> {
    await this.send(
      payload.telegram_chat_id,
      rewardUpdateNotification(payload),
    );
  }

  // ─── Monthly Report ────────────────────────

  async sendMonthlyReport(
    chatIds: number[],
    report: FinancialReport,
    monthLabel: string,
  ): Promise<void> {
    const text = monthlyReport(report, monthLabel);
    for (const chatId of chatIds) {
      await this.send(chatId, text).catch((err) =>
        console.error(`Failed to send report to ${chatId}:`, err),
      );
    }
  }

  // ─── Broadcast ────────────────────────────

  async broadcast(chatIds: number[], text: string): Promise<{ ok: number; fail: number }> {
    let ok = 0;
    let fail = 0;
    for (const chatId of chatIds) {
      try {
        await this.send(chatId, text);
        ok++;
      } catch {
        fail++;
      }
    }
    return { ok, fail };
  }
}

export const notifier = new Notifier();
