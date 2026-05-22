#!/usr/bin/env node
/**
 * Register Telegram webhook for Vercel deployment.
 * Usage:
 *   WEBHOOK_URL=https://your-app.vercel.app BOT_TOKEN=... node scripts/set-vercel-webhook.mjs
 */
const token = (process.env.BOT_TOKEN ?? '').trim();
const base = (process.env.WEBHOOK_URL ?? '').trim().replace(/\/$/, '');

if (!token || !base) {
  console.error('Set BOT_TOKEN and WEBHOOK_URL (e.g. https://telegram-mini-app-eight-beta.vercel.app)');
  process.exit(1);
}

const webhookUrl = `${base}/api/telegram/webhook`;
const params = new URLSearchParams({ url: webhookUrl, drop_pending_updates: 'true' });
const res = await fetch(`https://api.telegram.org/bot${token}/setWebhook?${params}`);
const json = await res.json();
console.log(JSON.stringify({ webhookUrl, ...json }, null, 2));
process.exit(json.ok ? 0 : 1);
