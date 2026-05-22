import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * One-time setup after deploy: register Telegram webhook URL.
 * GET /api/telegram/register-webhook?secret=YOUR_WEBHOOK_SETUP_SECRET
 */
export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const expected = (process.env.WEBHOOK_SETUP_SECRET ?? '').trim();
  const provided = String(req.query.secret ?? '').trim();
  if (!expected || provided !== expected) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const token = (process.env.BOT_TOKEN ?? '').trim();
  if (!token) {
    res.status(500).json({ error: 'BOT_TOKEN is not set' });
    return;
  }

  const base =
    (process.env.WEBHOOK_URL ?? '').trim().replace(/\/$/, '') ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '');
  if (!base) {
    res.status(500).json({ error: 'Set WEBHOOK_URL or deploy on Vercel (VERCEL_URL)' });
    return;
  }

  const webhookUrl = `${base}/api/telegram/webhook`;
  const params = new URLSearchParams({
    url: webhookUrl,
    drop_pending_updates: 'true',
  });

  const tgRes = await fetch(`https://api.telegram.org/bot${token}/setWebhook?${params}`);
  const body = await tgRes.json();

  res.status(tgRes.ok ? 200 : 500).json({
    ok: body.ok === true,
    webhookUrl,
    telegram: body,
  });
}
