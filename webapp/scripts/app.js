/* global Telegram */

// ─── Telegram WebApp init ──────────────────
const tg = window.Telegram.WebApp;
tg.ready();
tg.expand();

// Theme sync (light / dark)
document.documentElement.style.setProperty('--tg-theme-bg-color', tg.themeParams.bg_color || '#ffffff');
document.documentElement.style.setProperty('--tg-theme-text-color', tg.themeParams.text_color || '#1a1a1a');
document.documentElement.style.setProperty('--tg-theme-secondary-bg-color', tg.themeParams.secondary_bg_color || '#f5f0e8');
document.documentElement.style.setProperty('--tg-theme-hint-color', tg.themeParams.hint_color || '#6b6b6b');

// Parse query params for API auth token passed by the bot
const params = new URLSearchParams(window.location.search);
let ACCESS_TOKEN = params.get('token') || '';
const API_BASE = params.get('api') || 'http://localhost:9003';

async function ensureTelegramLogin() {
  if (ACCESS_TOKEN) return ACCESS_TOKEN;
  try {
    const initData = tg.initData || '';
    if (!initData) throw new Error('Missing Telegram init data');
    const res = await fetch(API_BASE + '/api/account/auth/telegram-webapp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ initData, platform: 'TelegramMiniApp' }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json?.message || 'Telegram login failed');
    ACCESS_TOKEN = json.token || '';
    if (!ACCESS_TOKEN) throw new Error('Missing token from server');
    return ACCESS_TOKEN;
  } catch (e) {
    throw e instanceof Error ? e : new Error('Telegram login failed');
  }
}

// ─── State ─────────────────────────────────
let allCategories = [];
let activeCatId = null;
let cart = [];              // [{ id, name, price, qty }]
let pendingItem = null;     // item being added via bottom sheet
let pendingQty = 1;

// ─── DOM refs ──────────────────────────────
const screenLoading = document.getElementById('screenLoading');
const screenError   = document.getElementById('screenError');
const screenMenu    = document.getElementById('screenMenu');
const screenCart    = document.getElementById('screenCart');
const screenConfirm = document.getElementById('screenConfirm');
const categoryTabs  = document.getElementById('categoryTabs');
const itemsGrid     = document.getElementById('itemsGrid');
const cartBadge     = document.getElementById('cartBadge');
const errorText     = document.getElementById('errorText');
const qtyValue      = document.getElementById('qtyValue');
const bsOverlay     = document.getElementById('bsOverlay');
const bottomSheet   = document.getElementById('bottomSheet');
const bsImage       = document.getElementById('bsImage');
const bsName        = document.getElementById('bsName');
const bsPrice       = document.getElementById('bsPrice');

// ─── Utility ───────────────────────────────
function showScreen(id) {
  [screenLoading, screenError, screenMenu, screenCart, screenConfirm].forEach((s) => {
    if (s) s.classList.add('hidden');
  });
  const target = document.getElementById(id);
  if (target) target.classList.remove('hidden');
}

function currency(n) { return '$' + Number(n).toFixed(2); }

function toast(msg) {
  let el = document.querySelector('.toast');
  if (!el) {
    el = document.createElement('div');
    el.className = 'toast';
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 2000);
}

// ─── Cart helpers ───────────────────────────
function cartCount() { return cart.reduce((s, i) => s + i.qty, 0); }
function cartTotal() { return cart.reduce((s, i) => s + i.price * i.qty, 0); }

function updateCartBadge() { cartBadge.textContent = cartCount(); }

function addItemToCart(item, qty) {
  const existing = cart.find((i) => i.id === item.id);
  if (existing) { existing.qty += qty; }
  else { cart.push({ id: item.id, name: item.name, price: item.unit_price, qty }); }
  updateCartBadge();
}

// ─── Load Menu ──────────────────────────────
async function loadMenu() {
  showScreen('screenLoading');
  try {
    const res = await fetch(API_BASE + '/api/share/menus');
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const json = await res.json();
    allCategories = json.data || [];

    if (!allCategories.length) {
      errorText.textContent = 'No menu items available right now.';
      showScreen('screenError');
      return;
    }

    renderCategories();
    selectCategory(allCategories[0].id);
    showScreen('screenMenu');
  } catch (err) {
    errorText.textContent = 'Failed to load menu: ' + err.message;
    showScreen('screenError');
  }
}

// ─── Render Categories ───────────────────────
function renderCategories() {
  categoryTabs.innerHTML = '';
  allCategories.forEach((cat) => {
    const btn = document.createElement('button');
    btn.className = 'cat-tab';
    btn.textContent = cat.name;
    btn.dataset.id = cat.id;
    btn.onclick = () => selectCategory(cat.id);
    categoryTabs.appendChild(btn);
  });
}

function selectCategory(catId) {
  activeCatId = catId;
  document.querySelectorAll('.cat-tab').forEach((b) => {
    b.classList.toggle('active', parseInt(b.dataset.id) === catId);
  });
  const cat = allCategories.find((c) => c.id === catId);
  renderItems(cat ? (cat.menus || []) : []);
}

// ─── Render Items ────────────────────────────
function renderItems(items) {
  itemsGrid.innerHTML = '';
  if (!items.length) {
    itemsGrid.innerHTML = '<p style="grid-column:span 2;text-align:center;color:var(--color-subtext);padding:24px">No items in this category</p>';
    return;
  }
  items.forEach((item) => {
    const card = document.createElement('div');
    card.className = 'item-card';
    card.onclick = () => openBottomSheet(item);
    card.innerHTML = item.image
      ? `<img class="item-img" src="${item.image}" alt="${item.name}" loading="lazy"/>`
      : `<div class="item-img-placeholder">☕</div>`;
    card.innerHTML += `
      <div class="item-body">
        <div class="item-name">${item.name}</div>
        <div class="item-price">${currency(item.unit_price)}</div>
        <div class="item-add-btn">+</div>
      </div>`;
    itemsGrid.appendChild(card);
  });
}

// ─── Bottom Sheet ────────────────────────────
function openBottomSheet(item) {
  pendingItem = item;
  pendingQty = 1;
  qtyValue.textContent = '1';

  if (item.image) {
    bsImage.src = item.image;
    bsImage.style.display = 'block';
    document.querySelector('.bs-image-wrap').style.background = 'transparent';
  } else {
    bsImage.style.display = 'none';
  }

  bsName.textContent = item.name;
  bsPrice.textContent = currency(item.unit_price);

  bsOverlay.classList.remove('hidden');
  bottomSheet.classList.remove('hidden');
}

function closeBottomSheet() {
  bsOverlay.classList.add('hidden');
  bottomSheet.classList.add('hidden');
  pendingItem = null;
}

function changeQty(delta) {
  pendingQty = Math.max(1, Math.min(99, pendingQty + delta));
  qtyValue.textContent = pendingQty;
}

function addToCart() {
  if (!pendingItem) return;
  addItemToCart(pendingItem, pendingQty);
  toast(`✅ ${pendingItem.name} ×${pendingQty} added`);
  closeBottomSheet();
}

// ─── Cart Screen ─────────────────────────────
document.getElementById('cartBtn').onclick = function () {
  renderCartScreen();
  showScreen('screenCart');
};

function renderCartScreen() {
  const container = document.getElementById('cartItems');
  const totalEl   = document.getElementById('cartTotal');

  if (!cart.length) {
    container.innerHTML = '<p style="text-align:center;color:var(--color-subtext);padding:32px">Your cart is empty</p>';
    totalEl.innerHTML = '';
    document.getElementById('checkoutBtn').style.display = 'none';
    return;
  }

  document.getElementById('checkoutBtn').style.display = '';
  container.innerHTML = '';
  cart.forEach((item, idx) => {
    const row = document.createElement('div');
    row.className = 'cart-row';
    row.innerHTML = `
      <div class="cart-row-name">${item.name}</div>
      <div class="cart-row-qty">
        <button class="qty-mini" onclick="adjustCart(${idx},-1)">−</button>
        <span class="qty-count">${item.qty}</span>
        <button class="qty-mini" onclick="adjustCart(${idx},1)">+</button>
      </div>
      <div class="cart-row-price">${currency(item.price * item.qty)}</div>
      <button class="cart-remove" onclick="removeFromCart(${idx})">🗑</button>
    `;
    container.appendChild(row);
  });

  totalEl.innerHTML = `<span>Total</span><span>${currency(cartTotal())}</span>`;
}

function adjustCart(idx, delta) {
  cart[idx].qty = Math.max(1, cart[idx].qty + delta);
  updateCartBadge();
  renderCartScreen();
}

function removeFromCart(idx) {
  cart.splice(idx, 1);
  updateCartBadge();
  renderCartScreen();
}

// ─── Checkout ────────────────────────────────
function checkout() {
  if (!cart.length) { toast('Cart is empty'); return; }
  renderConfirmScreen();
  showScreen('screenConfirm');
}

function renderConfirmScreen() {
  const container = document.getElementById('confirmItems');
  const totalEl   = document.getElementById('confirmTotal');

  container.innerHTML = '';
  cart.forEach((item) => {
    const row = document.createElement('div');
    row.className = 'cart-row';
    row.innerHTML = `
      <div class="cart-row-name">${item.name}</div>
      <div class="cart-row-qty"><span class="qty-count">×${item.qty}</span></div>
      <div class="cart-row-price">${currency(item.price * item.qty)}</div>
    `;
    container.appendChild(row);
  });

  totalEl.innerHTML = `<span>Total</span><span>${currency(cartTotal())}</span>`;
}

// ─── Place Order ─────────────────────────────
async function confirmOrder() {
  if (!cart.length) return;

  const btn = document.getElementById('confirmBtn');
  btn.disabled = true;
  btn.textContent = 'Placing order…';

  try {
    const cartPayload = JSON.stringify(cart.map((i) => ({ menu_id: i.id, quantity: i.qty })));
    const token = await ensureTelegramLogin();
    const headers = { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token };

    const res = await fetch(API_BASE + '/api/customer/orders', {
      method: 'POST',
      headers,
      body: JSON.stringify({ cart: cartPayload, channel: 'telegram' }),
    });

    const json = await res.json();
    if (!res.ok) throw new Error(json.message || 'Order failed');

    // Send result back to the bot
    const receiptData = JSON.stringify({
      type: 'order_placed',
      order_id: json.data.id,
      receipt_number: json.data.receipt_number,
      total: json.data.total_price,
    });
    tg.sendData(receiptData);

    // Also close the mini app
    tg.close();
  } catch (err) {
    toast('❌ ' + err.message);
    btn.disabled = false;
    btn.textContent = 'Place Order';
  }
}

// ─── Boot ────────────────────────────────────
loadMenu();
