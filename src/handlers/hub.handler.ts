import type { BotContext } from '../bot';
import { InlineKeyboard } from 'grammy';

export type HubTab = 'miniapp' | 'qr' | 'badge' | 'events';

const CUSTOMER_URL = 'https://customer.navahub.org';
const EVENTS_URL = 'https://club54.navahub.org/events';

const TAB_LABELS: Record<HubTab, string> = {
  miniapp: 'Mini App',
  qr: 'QR',
  badge: 'Badge',
  events: 'Events',
};

function hubKeyboard(activeTab: HubTab): InlineKeyboard {
  const kb = new InlineKeyboard();

  // Tab row — active tab gets a bullet prefix
  (Object.keys(TAB_LABELS) as HubTab[]).forEach((tab) => {
    const label = tab === activeTab ? `● ${TAB_LABELS[tab]}` : TAB_LABELS[tab];
    kb.text(label, `hub:${tab}`);
  });

  // Action button row for tabs that open a mini app
  if (activeTab === 'miniapp') {
    kb.row().webApp('Open Mini App', CUSTOMER_URL);
  } else if (activeTab === 'qr') {
    kb.row().webApp('Open QR Code', `${CUSTOMER_URL}/profile/qr`);
  } else if (activeTab === 'events') {
    kb.row().webApp('View Events', EVENTS_URL);
  }

  return kb;
}

function hubMessage(activeTab: HubTab): string {
  switch (activeTab) {
    case 'miniapp':
      return '<b>Mini App</b>\n\nOpen the customer portal to browse and place orders.';
    case 'qr':
      return '<b>QR Code</b>\n\nOpen your personal QR code for check-in or payment.';
    case 'badge':
      return '<b>Badge Display</b>\n\n🚧 <i>Coming Soon</i>';
    case 'events':
      return '<b>Event Schedule</b>\n\nBrowse upcoming events and schedules.';
  }
}

export async function hubHandler(ctx: BotContext): Promise<void> {
  await ctx.reply(hubMessage('miniapp'), {
    parse_mode: 'HTML',
    reply_markup: hubKeyboard('miniapp'),
  });
}

export async function hubTabHandler(ctx: BotContext, tab: HubTab): Promise<void> {
  await ctx.answerCallbackQuery();
  await ctx.editMessageText(hubMessage(tab), {
    parse_mode: 'HTML',
    reply_markup: hubKeyboard(tab),
  });
}
