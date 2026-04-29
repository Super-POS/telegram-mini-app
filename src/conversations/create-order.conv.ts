/**
 * Order-creation conversation.
 *
 * This is driven by inline keyboard callbacks — not text input.
 * Steps managed here are for the quantity-picking step.
 *
 * Flow:
 *   1. /menu command opens the customer web Mini App when HTTPS is configured
 *   2. Tap category  → shows items in that category
 *   3. Tap item      → asks for quantity (sets conv step = 'ask_qty')
 *   4. User types qty → item added to cart
 *   5. /order or "Checkout" → shows cart summary → confirm
 *   6. Place order via API
 */

import type { BotContext } from '../bot';
import { InlineKeyboard } from 'grammy';
import { getPublicMenus } from '../api/menu.api';
import { placeOrder } from '../api/order.api';
import {
  cartSummary,
  orderReceipt,
  errorMessage,
  notLinkedMessage,
} from '../templates/messages.template';
import type { MenuItem } from '../types';
import { config } from '../config';

// ─── Show Categories ─────────────────────────

export async function showMenuCategories(ctx: BotContext): Promise<void> {
  // ── Preferred: open the Mini App as a popup ──────────────────────────
  if (config.webappUrlIsHttps) {
    const keyboard = new InlineKeyboard().webApp('Browse Menu & Order', config.webappUrl);
    await ctx.reply(
      '<b>Our Coffee Menu</b>\n\nTap below to browse the image menu and place your order:',
      { parse_mode: 'HTML', reply_markup: keyboard },
    );
    return;
  }

  if (!ctx.session.linkedAccount) {
    await ctx.reply(notLinkedMessage(), { parse_mode: 'HTML' });
    return;
  }

  // ── Fallback: inline keyboard (no HTTPS) ─────────────────────────────
  const loading = await ctx.reply('Loading menu…');

  try {
    const categories = await getPublicMenus();
    await ctx.api.deleteMessage(ctx.chat!.id, loading.message_id).catch(() => null);

    if (!categories.length) {
      await ctx.reply('No menu items available right now.', { parse_mode: 'HTML' });
      return;
    }

    const keyboard = new InlineKeyboard();
    categories.forEach((cat, i) => {
      keyboard.text(`${cat.name}`, `cat:${cat.id}`);
      if ((i + 1) % 2 === 0) keyboard.row();
    });
    keyboard.row().text('View Cart', 'cmd:cart');

    await ctx.reply('<b>Our Menu</b>\n\nSelect a category:', {
      parse_mode: 'HTML',
      reply_markup: keyboard,
    });
  } catch (err: unknown) {
    await ctx.api.deleteMessage(ctx.chat!.id, loading.message_id).catch(() => null);
    const msg = err instanceof Error ? err.message : undefined;
    await ctx.reply(errorMessage(msg), { parse_mode: 'HTML' });
  }
}

// ─── Show Items for a Category ───────────────

export async function showCategoryItems(
  ctx: BotContext,
  categoryId: number,
): Promise<void> {
  if (!ctx.session.linkedAccount) {
    await ctx.answerCallbackQuery();
    return;
  }

  try {
    const categories = await getPublicMenus();
    const category = categories.find((c) => c.id === categoryId);

    if (!category || !category.menus?.length) {
      await ctx.answerCallbackQuery('No items in this category');
      return;
    }

    const keyboard = new InlineKeyboard();
    category.menus.forEach((item: MenuItem) => {
      keyboard
        .text(`${item.name} — ${item.unit_price.toFixed(0)} KHR`, `item:${item.id}`)
        .row();
    });
    keyboard
      .text('Back to Categories', 'cmd:menu')
      .text('Cart', 'cmd:cart');

    await ctx.editMessageText(
      `<b>${category.name}</b>\n\nSelect an item to add to cart:`,
      { parse_mode: 'HTML', reply_markup: keyboard },
    );
    await ctx.answerCallbackQuery();
  } catch (err: unknown) {
    await ctx.answerCallbackQuery('Failed to load items');
  }
}

// ─── Ask Quantity (enters step) ──────────────

export async function askItemQuantity(ctx: BotContext, itemId: number): Promise<void> {
  if (!ctx.session.linkedAccount) {
    await ctx.answerCallbackQuery();
    return;
  }

  try {
    const categories = await getPublicMenus();
    let foundItem: MenuItem | undefined;
    for (const cat of categories) {
      foundItem = cat.menus?.find((m) => m.id === itemId);
      if (foundItem) break;
    }

    if (!foundItem) {
      await ctx.answerCallbackQuery('Item not found');
      return;
    }

    ctx.session.conv = {
      name: 'createOrder',
      step: 'ask_qty',
      data: {
        itemId: foundItem.id,
        itemName: foundItem.name,
        unitPrice: foundItem.unit_price,
      },
    };

    await ctx.answerCallbackQuery();
    await ctx.reply(
      `<b>${foundItem.name}</b> — ${foundItem.unit_price.toFixed(0)} KHR\n\n` +
        `How many would you like? (Enter a number, e.g. <code>1</code>)`,
      { parse_mode: 'HTML' },
    );
  } catch {
    await ctx.answerCallbackQuery('Error loading item');
  }
}

// ─── Handle Quantity Input ───────────────────

export async function handleCreateOrderStep(ctx: BotContext): Promise<void> {
  const text = ctx.message?.text?.trim();
  if (!text) return;

  const { step, data } = ctx.session.conv;

  if (step === 'ask_qty') {
    const qty = parseInt(text, 10);
    if (isNaN(qty) || qty < 1 || qty > 99) {
      await ctx.reply('Please enter a valid number between 1 and 99.');
      return;
    }

    const cart = ctx.session.cart;
    const existing = cart.find((i) => i.menuId === (data.itemId as number));
    if (existing) {
      existing.quantity += qty;
    } else {
      cart.push({
        menuId: data.itemId as number,
        menuName: data.itemName as string,
        quantity: qty,
        unitPrice: data.unitPrice as number,
      });
    }

    ctx.session.conv = { name: null, step: null, data: {} };

    const keyboard = new InlineKeyboard()
      .text('Add More', 'cmd:menu')
      .text('View Cart', 'cmd:cart')
      .row()
      .text('Checkout', 'cmd:checkout');

    await ctx.reply(
      `<b>${data.itemName as string} x${qty}</b> added to cart!\n\n` + cartSummary(cart),
      { parse_mode: 'HTML', reply_markup: keyboard },
    );
  }
}

// ─── Show Cart ───────────────────────────────

export async function showCart(ctx: BotContext): Promise<void> {
  // When the webapp is active, redirect there (cart lives in the webapp)
  if (config.webappUrlIsHttps) {
    await showMenuCategories(ctx);
    return;
  }

  const cart = ctx.session.cart;

  if (!cart.length) {
    const keyboard = new InlineKeyboard().text('Browse Menu', 'cmd:menu');
    await ctx.reply(cartSummary(cart), { parse_mode: 'HTML', reply_markup: keyboard });
    return;
  }

  const keyboard = new InlineKeyboard()
    .text('Checkout', 'cmd:checkout')
    .text('Clear Cart', 'cmd:clear_cart')
    .row()
    .text('Add More', 'cmd:menu');

  await ctx.reply(cartSummary(cart), {
    parse_mode: 'HTML',
    reply_markup: keyboard,
  });
}

// ─── Checkout Confirmation ───────────────────

export async function showCheckout(ctx: BotContext): Promise<void> {
  const cart = ctx.session.cart;

  if (!cart.length) {
    await ctx.answerCallbackQuery('Your cart is empty');
    return;
  }

  const total = cart.reduce((s, i) => s + i.unitPrice * i.quantity, 0);

  const keyboard = new InlineKeyboard()
    .text('Confirm Order', 'cmd:confirm_order')
    .text('Cancel', 'cmd:cart');

  await ctx.editMessageText(
    cartSummary(cart) +
      `\n\n<b>Total: ${total.toFixed(0)} KHR</b>\n\nConfirm your order?`,
    { parse_mode: 'HTML', reply_markup: keyboard },
  );
  await ctx.answerCallbackQuery();
}

// ─── Confirm & Place Order ───────────────────

export async function confirmAndPlaceOrder(ctx: BotContext): Promise<void> {
  if (!ctx.session.linkedAccount) {
    await ctx.answerCallbackQuery('Please link your account first');
    return;
  }

  const cart = ctx.session.cart;
  if (!cart.length) {
    await ctx.answerCallbackQuery('Cart is empty');
    return;
  }

  await ctx.answerCallbackQuery();
  const loadingMsg = await ctx.reply('Placing your order…');

  try {
    const cartPayload = cart.map((i) => ({ menu_id: i.menuId, quantity: i.quantity }));
    const order = await placeOrder(ctx.session.linkedAccount.accessToken, {
      cart: JSON.stringify(cartPayload),
      channel: 'telegram',
    });

    ctx.session.cart = [];

    await ctx.api.deleteMessage(ctx.chat!.id, loadingMsg.message_id).catch(() => null);

    const keyboard = new InlineKeyboard()
      .text('Track Order', `order:track:${order.id}`)
      .text('New Order', 'cmd:menu');

    await ctx.reply(orderReceipt(order), {
      parse_mode: 'HTML',
      reply_markup: keyboard,
    });
  } catch (err: unknown) {
    await ctx.api.deleteMessage(ctx.chat!.id, loadingMsg.message_id).catch(() => null);
    const msg = err instanceof Error ? err.message : undefined;
    await ctx.reply(errorMessage(msg), { parse_mode: 'HTML' });
  }
}
