import type { VercelRequest, VercelResponse } from '@vercel/node';
import { webhookCallback } from 'grammy';

type WebhookHandler = (req: VercelRequest, res: VercelResponse) => Promise<void>;

declare global {
  // eslint-disable-next-line no-var
  var __telegramWebhookHandler: WebhookHandler | undefined;
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (req.method === 'GET') {
    res.status(200).json({ ok: true, service: 'telegram-webhook' });
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  if (!global.__telegramWebhookHandler) {
    const { getBot } = require('../../dist/bot-instance') as typeof import('../../dist/bot-instance');
    const bot = getBot();
    global.__telegramWebhookHandler = webhookCallback(bot, 'https') as WebhookHandler;
  }

  await global.__telegramWebhookHandler(req, res);
}
