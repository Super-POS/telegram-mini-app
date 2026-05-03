import 'dotenv/config';
import express from 'express';
import path from 'path';
import axios from 'axios';
import { createBot } from './bot';
import { createSessionStorage } from './storage/session-storage.factory';
import { notifier } from './notifications/notifier';
import { customerStore } from './notifications/customer-store';
import { startMonthlyReportScheduler } from './scheduler/monthly-report.scheduler';
import { config } from './config';
import type {
  OrderNotificationPayload,
  PaymentNotificationPayload,
  RewardNotificationPayload,
} from './types';

async function bootstrap(): Promise<void> {
  // ─── Bot ────────────────────────────────
  const sessionStorage = createSessionStorage();
  const bot = createBot(sessionStorage);
  notifier.setBot(bot);

  // ─── Express server ─────────────────────
  const app = express();
  app.use(express.json());

  // Serve the Telegram Mini App static files
  app.use('/webapp', express.static(path.join(__dirname, '..', 'webapp')));

  // ─── API Proxy ──────────────────────────────
  // Forwards /api/* → internal POS API (http://localhost:9003).
  // The Mini App cannot reach localhost:9003 directly; it goes through ngrok → here.
  app.all('/api/*', async (req, res) => {
    try {
      const targetUrl = config.apiBaseUrl + req.path;
      const forwardHeaders: Record<string, string> = {
        'content-type': (req.headers['content-type'] as string) || 'application/json',
      };
      if (req.headers['authorization']) {
        forwardHeaders['authorization'] = req.headers['authorization'] as string;
      }
      const response = await axios({
        method: req.method as 'get' | 'post' | 'put' | 'patch' | 'delete',
        url: targetUrl,
        params: req.query,
        data: ['GET', 'HEAD'].includes(req.method.toUpperCase()) ? undefined : req.body,
        headers: forwardHeaders,
        validateStatus: () => true,
      });
      res.status(response.status).json(response.data);
    } catch (err) {
      console.error('[api-proxy]', err);
      res.status(502).json({ message: 'Proxy error' });
    }
  });

  // ─── Internal notification endpoints ────
  // Called by api-v1 when an order / payment / reward event fires.
  // Secure these with a shared secret in production.

  app.post('/notify/order', async (req, res) => {
    try {
      const payload = req.body as OrderNotificationPayload;
      await notifier.sendOrderUpdate(payload);
      res.json({ ok: true });
    } catch (err) {
      console.error('[notify/order]', err);
      res.status(500).json({ ok: false });
    }
  });

  app.post('/notify/payment', async (req, res) => {
    try {
      const payload = req.body as PaymentNotificationPayload;
      await notifier.sendPaymentUpdate(payload);
      res.json({ ok: true });
    } catch (err) {
      console.error('[notify/payment]', err);
      res.status(500).json({ ok: false });
    }
  });

  app.post('/notify/reward', async (req, res) => {
    try {
      const payload = req.body as RewardNotificationPayload;
      await notifier.sendRewardUpdate(payload);
      res.json({ ok: true });
    } catch (err) {
      console.error('[notify/reward]', err);
      res.status(500).json({ ok: false });
    }
  });

  // Health check
  app.get('/health', (_req, res) => res.json({ ok: true, time: new Date().toISOString() }));

  // ─── Customer Web Proxy ───────────────────
  // Serves customer_web_v1 through the same public Telegram/ngrok origin.
  app.all('*', async (req, res, next) => {
    if (req.path.startsWith('/telegram/')) {
      return next();
    }
    try {
      const response = await axios({
        method: req.method as 'get' | 'post' | 'put' | 'patch' | 'delete',
        url: `${config.customerWebBaseUrl}${req.originalUrl}`,
        data: ['GET', 'HEAD'].includes(req.method.toUpperCase()) ? undefined : req.body,
        headers: {
          ...req.headers,
          host: undefined,
        },
        responseType: 'arraybuffer',
        validateStatus: () => true,
      });
      Object.entries(response.headers).forEach(([key, value]) => {
        if (value !== undefined) {
          res.setHeader(key, value as string | string[]);
        }
      });
      res.status(response.status).send(response.data);
    } catch (err) {
      console.error('[customer-web-proxy]', err);
      res.status(502).send('Customer web proxy error');
    }
  });

  // ─── Webhook or Polling ─────────────────
  if (config.webhookUrl) {
    const webhookPath = '/telegram/webhook';
    // grammY webhook handler — use bot.webhookCallback for express
    const webhookCb = (bot as any).webhookCallback
      ? (bot as any).webhookCallback(webhookPath)
      : null;
    if (webhookCb) app.use(webhookCb);
    await bot.api.setWebhook(`${config.webhookUrl}${webhookPath}`);
    console.log(`[bot] Webhook set → ${config.webhookUrl}${webhookPath}`);
  } else {
    try {
      await bot.api.deleteWebhook({ drop_pending_updates: false });
    } catch (e) {
      console.warn('[bot] deleteWebhook failed (continuing with polling):', e);
    }
    bot.start({
      onStart: (info) => console.log(`[bot] Polling started as @${info.username}`),
    });
  }

  app.listen(config.webhookPort, () => {
    console.log(`[server] Listening on port ${config.webhookPort}`);
    console.log(`[server] Mini App → ${config.webappUrl}`);
  });

  // ─── Scheduler ──────────────────────────
  startMonthlyReportScheduler();

  // ─── Graceful shutdown ──────────────────
  const shutdown = async () => {
    console.log('[bot] Shutting down…');
    await bot.stop();
    if (typeof sessionStorage.close === 'function') {
      await sessionStorage.close().catch(() => null);
    }
    process.exit(0);
  };
  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);
}

bootstrap().catch((err) => {
  console.error('[bootstrap] Fatal error:', err);
  process.exit(1);
});
