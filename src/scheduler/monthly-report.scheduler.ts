import cron from 'node-cron';
import { login } from '../api/auth.api';
import { getFinancialReport } from '../api/admin.api';
import { notifier } from '../notifications/notifier';
import { config } from '../config';

/** Runs on the 1st of every month at 08:00 */
export function startMonthlyReportScheduler(): void {
  if (!config.adminChatIds.length) {
    console.log('[scheduler] No admin chat IDs configured — monthly report skipped.');
    return;
  }

  // '0 8 1 * *' = 08:00 on the 1st day of every month
  cron.schedule('0 8 1 * *', async () => {
    console.log('[scheduler] Running monthly report…');

    try {
      const token = (await login(config.adminUsername, config.adminPassword))
        .access_token;

      const now = new Date();
      // Report for the previous month
      const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const from = prevMonth.toISOString().slice(0, 10);
      const to = new Date(now.getFullYear(), now.getMonth(), 0)
        .toISOString()
        .slice(0, 10);
      const label = prevMonth.toLocaleString('default', {
        month: 'long',
        year: 'numeric',
      });

      const report = await getFinancialReport(token, {
        from,
        to,
        granularity: 'monthly',
      });

      await notifier.sendMonthlyReport(config.adminChatIds, report, label);
      console.log(`[scheduler] Monthly report sent to ${config.adminChatIds.length} admins.`);
    } catch (err) {
      console.error('[scheduler] Monthly report failed:', err);
    }
  });

  console.log('[scheduler] Monthly report scheduler started (1st of every month at 08:00).');
}
