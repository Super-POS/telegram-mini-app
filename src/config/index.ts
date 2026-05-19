import 'dotenv/config';

import type { PoolConfig } from 'pg';

/**
 * When SESSION_DB_* / DB_* point at Postgres, bot sessions use table `telegram_bot_sessions`.
 * If host/database are unset, sessions fall back to data/sessions.json.
 */
export function getSessionPostgresConfig(): PoolConfig | null {
  const host = (process.env.SESSION_DB_HOST ?? process.env.DB_HOST ?? '').trim();
  const database = (process.env.SESSION_DB_DATABASE ?? process.env.DB_DATABASE ?? '').trim();
  if (!host || !database) {
    return null;
  }
  const password = String(process.env.SESSION_DB_PASSWORD ?? process.env.DB_PASSWORD ?? '');
  const user = (process.env.SESSION_DB_USERNAME ?? process.env.DB_USERNAME ?? 'postgres').trim();
  const port = parseInt(process.env.SESSION_DB_PORT ?? process.env.DB_PORT ?? '5432', 10);
  const sslRaw = (process.env.SESSION_DB_SSL ?? process.env.DB_SSL ?? '').trim().toLowerCase();
  const ssl =
    sslRaw === 'true' || sslRaw === '1'
      ? { rejectUnauthorized: process.env.SESSION_DB_SSL_REJECT_UNAUTHORIZED !== 'false' }
      : undefined;
  return {
    host,
    port,
    database,
    user,
    password,
    ...(ssl ? { ssl } : {}),
  };
}

function require_env(key: string): string {
  const value = process.env[key];
  if (!value) throw new Error(`Missing required env var: ${key}`);
  return value;
}

export const config = {
  botToken: require_env('BOT_TOKEN'),
  apiBaseUrl: process.env.API_BASE_URL ?? 'http://localhost:9003',
  /** Must match api-v1 `TELEGRAM_BOT_SERVER_SECRET` — used for server-to-server /start sign-in. */
  telegramBotServerSecret: process.env.TELEGRAM_BOT_SERVER_SECRET ?? '',
  adminUsername: process.env.ADMIN_USERNAME ?? '',
  adminPassword: process.env.ADMIN_PASSWORD ?? '',
  webhookUrl: process.env.WEBHOOK_URL ?? '',
  webhookPort: parseInt(process.env.WEBHOOK_PORT ?? '3001', 10),
  /** HTTPS URL of customer_web_v1 (Mini App). Prefer WEBAPP_URL; else CUSTOMER_WEB_BASE_URL. */
  webappUrl: (
    process.env.WEBAPP_URL ||
    process.env.CUSTOMER_WEB_BASE_URL ||
    'http://localhost:3000'
  )
    .trim()
    .replace(/\/$/, ''),
  customerWebBaseUrl: (process.env.CUSTOMER_WEB_BASE_URL ?? process.env.WEBAPP_URL ?? 'http://localhost:3000')
    .trim()
    .replace(/\/$/, ''),
  adminChatIds: (process.env.ADMIN_CHAT_IDS ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .map(Number),
  isDev: process.env.NODE_ENV !== 'production',
  /** Show GrammY webApp() buttons. True for https:// URLs, or http:// when WEBAPP_ALLOW_HTTP is set (self-hosted; Telegram may still block on some clients). */
  get webappUrlIsHttps(): boolean {
    const u = this.webappUrl.trim().toLowerCase();
    if (u.startsWith('https://')) return true;
    const allowHttp = ['true', '1', 'yes'].includes((process.env.WEBAPP_ALLOW_HTTP ?? '').trim().toLowerCase());
    return allowHttp && u.startsWith('http://');
  },
  /** Public origin of the bot's Express server (= ngrok origin when tunnelling).
   *  Derived from WEBAPP_URL so no extra env var is needed.
   *  e.g. "https://134c-202-62-53-3.ngrok-free.app" */
  get publicUrl(): string {
    try { return new URL(this.webappUrl).origin; } catch { return ''; }
  },
} as const;
