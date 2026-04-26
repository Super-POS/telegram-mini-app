import 'dotenv/config';

function require_env(key: string): string {
  const value = process.env[key];
  if (!value) throw new Error(`Missing required env var: ${key}`);
  return value;
}

export const config = {
  botToken: require_env('BOT_TOKEN'),
  apiBaseUrl: process.env.API_BASE_URL ?? 'http://localhost:9003',
  adminUsername: process.env.ADMIN_USERNAME ?? '',
  adminPassword: process.env.ADMIN_PASSWORD ?? '',
  webhookUrl: process.env.WEBHOOK_URL ?? '',
  webhookPort: parseInt(process.env.WEBHOOK_PORT ?? '3001', 10),
  webappUrl: process.env.WEBAPP_URL ?? 'http://localhost:3001/webapp',
  adminChatIds: (process.env.ADMIN_CHAT_IDS ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .map(Number),
  isDev: process.env.NODE_ENV !== 'production',
  get webappUrlIsHttps(): boolean {
    return this.webappUrl.startsWith('https://');
  },
  /** Public origin of the bot's Express server (= ngrok origin when tunnelling).
   *  Derived from WEBAPP_URL so no extra env var is needed.
   *  e.g. "https://134c-202-62-53-3.ngrok-free.app" */
  get publicUrl(): string {
    try { return new URL(this.webappUrl).origin; } catch { return ''; }
  },
} as const;
