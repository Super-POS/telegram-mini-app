import type {
  CartItem,
  Order,
  Deposit,
  RewardInfo,
  WalletInfo,
  DashboardSummary,
  FinancialReport,
  OrderNotificationPayload,
  PaymentNotificationPayload,
  RewardNotificationPayload,
} from '../types';

const LINE = '━━━━━━━━━━━━━━━━━━━━━━';
const THIN = '──────────────────────';

// ─── Helpers ────────────────────────────────

function currency(amount: number): string {
  return `$${Number(amount).toFixed(2)}`;
}

function orderStatusEmoji(status: string): string {
  const map: Record<string, string> = {
    pending: '⏳',
    accepted: '✅',
    preparing: '👨‍🍳',
    ready: '🔔',
    completed: '🎉',
    cancelled: '❌',
  };
  return map[status] ?? '❓';
}

function orderStatusLabel(status: string): string {
  const map: Record<string, string> = {
    pending: 'Pending',
    accepted: 'Accepted',
    preparing: 'Preparing',
    ready: 'Ready for pickup',
    completed: 'Completed',
    cancelled: 'Cancelled',
  };
  return map[status] ?? status;
}

// ─── Account Linking ────────────────────────

export function welcomeNewUser(name: string): string {
  return (
    `☕ <b>Welcome to CoffeeShop POS, ${name}!</b>\n\n` +
    `Your account has been linked successfully.\n\n` +
    `<b>Quick Commands:</b>\n` +
    `/menu — Browse our coffee menu\n` +
    `/cart — View your cart\n` +
    `/order — Place an order\n` +
    `/deposit — Top up wallet\n` +
    `/status — Track latest order\n` +
    `/help — Show all commands`
  );
}

export function alreadyLinked(name: string): string {
  return `✅ You're already linked as <b>${name}</b>.\n\nUse /help to see available commands.`;
}

/** After /start — POS account is created or matched by Telegram ID and session is logged in. */
export function telegramAutoWelcome(name: string): string {
  return (
    `☕ <b>Welcome, ${name}!</b>\n\n` +
    `You're signed in with your Telegram account.\n\n` +
    `<b>Quick Commands:</b>\n` +
    `/menu — Browse our coffee menu\n` +
    `/cart — View your cart\n` +
    `/order — Place an order\n` +
    `/deposit — Top up wallet\n` +
    `/status — Track latest order\n` +
    `/help — Show all commands`
  );
}

// ─── Cart ────────────────────────────────────

export function cartSummary(cart: CartItem[]): string {
  if (cart.length === 0) return '🛒 Your cart is empty.\n\nUse /menu to browse items.';

  const total = cart.reduce((s, i) => s + i.unitPrice * i.quantity, 0);
  const lines = cart.map(
    (i) =>
      `• ${i.menuName} x${i.quantity}  <i>${currency(i.unitPrice * i.quantity)}</i>` +
      (i.note ? `\n  📝 ${i.note}` : ''),
  );

  return (
    `🛒 <b>Your Cart</b>\n${THIN}\n` +
    lines.join('\n') +
    `\n${THIN}\n<b>Total: ${currency(total)}</b>`
  );
}

// ─── Order Receipt ───────────────────────────

export function orderReceipt(order: Order): string {
  const items = (order.items ?? []).map(
    (i) => `• ${i.menu_name} x${i.quantity}  <i>${currency(i.subtotal)}</i>`,
  );

  return (
    `🧾 <b>ORDER RECEIPT</b>\n${LINE}\n` +
    `📋 Receipt: <code>#${order.receipt_number}</code>\n` +
    `📅 Date: ${new Date(order.created_at).toLocaleString()}\n` +
    `${THIN}\n` +
    (items.length ? items.join('\n') + '\n' : '') +
    `${LINE}\n` +
    `💰 <b>Total: ${currency(order.total_amount)}</b>\n` +
    `${orderStatusEmoji(order.status)} Status: <b>${orderStatusLabel(order.status)}</b>`
  );
}

// ─── Order Status Notification ───────────────

export function orderStatusNotification(payload: OrderNotificationPayload): string {
  const emoji = orderStatusEmoji(payload.status);
  const label = orderStatusLabel(payload.status);

  return (
    `${emoji} <b>Order Update</b>\n${THIN}\n` +
    `📋 Receipt: <code>#${payload.receipt_number}</code>\n` +
    `Status: <b>${label}</b>\n` +
    `💰 Total: ${currency(payload.total_amount)}`
  );
}

// ─── Payment Notification ────────────────────

export function paymentStatusNotification(
  payload: PaymentNotificationPayload,
): string {
  const emoji =
    payload.payment_status === 'success'
      ? '✅'
      : payload.payment_status === 'failed'
      ? '❌'
      : '⏰';
  const label =
    payload.payment_status === 'success'
      ? 'Payment Confirmed'
      : payload.payment_status === 'failed'
      ? 'Payment Failed'
      : 'Payment Expired';

  return (
    `${emoji} <b>${label}</b>\n${THIN}\n` +
    `📋 Order: <code>#${payload.receipt_number}</code>\n` +
    `💰 Amount: ${currency(payload.amount)}\n` +
    `💳 Method: ${payload.method}`
  );
}

// ─── Reward Notification ─────────────────────

export function rewardUpdateNotification(
  payload: RewardNotificationPayload,
): string {
  return (
    `⭐ <b>Reward Points Earned!</b>\n${THIN}\n` +
    `Hi <b>${payload.customer_name}</b>!\n` +
    `You earned <b>+${payload.points_earned} pts</b>\n` +
    `Total: <b>${payload.total_points} pts</b> | Tier: ${payload.tier}`
  );
}

// ─── Deposit ─────────────────────────────────

export function depositConfirmation(deposit: Deposit): string {
  return (
    `💳 <b>Deposit Request Submitted</b>\n${THIN}\n` +
    `🆔 ID: <code>#${deposit.id}</code>\n` +
    `💰 Amount: ${currency(deposit.amount)}\n` +
    `📎 Reference: <code>${deposit.reference}</code>\n` +
    (deposit.note ? `📝 Note: ${deposit.note}\n` : '') +
    `⏳ Status: <b>Pending approval</b>\n\n` +
    `Our team will review your deposit shortly.`
  );
}

export function walletBalance(wallet: WalletInfo): string {
  return `💰 <b>Wallet Balance</b>\n${THIN}\n<b>${currency(wallet.balance)}</b>`;
}

// ─── Rewards ─────────────────────────────────

export function rewardProfile(reward: RewardInfo): string {
  return (
    `⭐ <b>My Rewards</b>\n${THIN}\n` +
    `Points: <b>${reward.points} pts</b>\n` +
    `Tier: <b>${reward.tier}</b>\n` +
    `Total Earned: ${reward.total_earned} pts\n` +
    `Total Redeemed: ${reward.total_redeemed} pts`
  );
}

// ─── Monthly Report ──────────────────────────

export function monthlyReport(
  report: FinancialReport,
  monthLabel: string,
): string {
  return (
    `📊 <b>Monthly Report — ${monthLabel}</b>\n${LINE}\n` +
    `💰 Revenue: <b>${currency(report.total_revenue)}</b>\n` +
    `📦 Orders: <b>${report.total_orders}</b>\n` +
    `👥 Customers: <b>${report.total_customers}</b>\n` +
    (report.total_orders > 0
      ? `📈 Avg Order: <b>${currency(report.total_revenue / report.total_orders)}</b>\n`
      : '') +
    `${LINE}\n<i>Generated automatically on ${new Date().toLocaleDateString()}</i>`
  );
}

export function dashboardSummary(summary: DashboardSummary): string {
  return (
    `📊 <b>Dashboard Summary</b>\n${LINE}\n` +
    `💰 Revenue: <b>${currency(summary.total_revenue)}</b>\n` +
    `📦 Orders: <b>${summary.total_orders}</b>\n` +
    `👥 Customers: <b>${summary.total_customers}</b>\n` +
    `⏳ Pending Orders: <b>${summary.pending_orders}</b>`
  );
}

// ─── Help ────────────────────────────────────

export function helpMessage(): string {
  return (
    `☕ <b>CoffeeShop Bot — Commands</b>\n${LINE}\n\n` +
    `<b>🛒 Ordering</b>\n` +
    `/menu — Browse coffee menu\n` +
    `/cart — View your cart\n` +
    `/order — Place order from cart\n` +
    `/status — Track your latest order\n\n` +
    `<b>💰 Wallet</b>\n` +
    `/deposit — Request a top-up\n` +
    `/wallet — Check balance & history\n` +
    `/rewards — View reward points\n\n` +
    `<b>⚙️ Account</b>\n` +
    `/start — Sign in with Telegram (creates account if new)\n` +
    `/profile — View your profile\n` +
    `/unlink — Unlink account\n\n` +
    `<b>👑 Admin Only</b>\n` +
    `/report — View financial report\n` +
    `/broadcast — Send announcement\n\n` +
    `<b>❓ Other</b>\n` +
    `/help — Show this message`
  );
}

export function errorMessage(msg?: string): string {
  return `⚠️ ${msg ?? 'Something went wrong. Please try again later.'}\n\nType /help for available commands.`;
}

export function notLinkedMessage(): string {
  return `🔐 Please link your account first.\n\nSend /start to get started.`;
}
