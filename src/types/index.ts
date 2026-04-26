// ─────────────────────────────────────────────
//  Domain Types
// ─────────────────────────────────────────────

export interface LinkedAccount {
  accessToken: string;
  customerId: number;
  name: string;
  phone: string;
}

export interface CartItem {
  menuId: number;
  menuName: string;
  quantity: number;
  unitPrice: number;
  note?: string;
}

// ─────────────────────────────────────────────
//  Session
// ─────────────────────────────────────────────

export type ConvName =
  | 'linkAccount'
  | 'createOrder'
  | 'deposit'
  | null;

export interface ConvState {
  name: ConvName;
  step: string | null;
  data: Record<string, unknown>;
}

export interface SessionData {
  linkedAccount: LinkedAccount | null;
  cart: CartItem[];
  conv: ConvState;
}

// ─────────────────────────────────────────────
//  API Response
// ─────────────────────────────────────────────

export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
}

// ─────────────────────────────────────────────
//  POS Entities
// ─────────────────────────────────────────────

export interface MenuType {
  id: number;
  name: string;
}

export interface MenuItem {
  id: number;
  name: string;
  code: string;
  unit_price: number;
  type?: MenuType;
  image?: string;
}

export interface MenuCategory {
  id: number;
  name: string;
  menus?: MenuItem[];
}

export interface OrderItem {
  menu_id?: number;
  menu_name: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
}

export type OrderStatus =
  | 'pending'
  | 'accepted'
  | 'preparing'
  | 'ready'
  | 'completed'
  | 'cancelled';

export interface Order {
  id: number;
  receipt_number: string;
  status: OrderStatus;
  total_amount: number;
  channel: string;
  created_at: string;
  items?: OrderItem[];
}

export interface WalletInfo {
  balance: number;
  customer_id: number;
}

export interface RewardInfo {
  points: number;
  tier: string;
  total_earned: number;
  total_redeemed: number;
}

export interface CustomerProfile {
  id: number;
  name: string;
  phone: string;
  email: string;
  wallet?: WalletInfo;
  rewards?: RewardInfo;
}

export interface Deposit {
  id: number;
  amount: number;
  reference: string;
  note?: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
}

export interface FinancialReport {
  total_revenue: number;
  total_orders: number;
  total_customers: number;
  data?: Array<{
    date: string;
    revenue: number;
    orders: number;
  }>;
}

export interface DashboardSummary {
  total_revenue: number;
  total_orders: number;
  total_customers: number;
  pending_orders: number;
}

// ─────────────────────────────────────────────
//  Notification Payload (internal — api-v1 → bot)
// ─────────────────────────────────────────────

export interface OrderNotificationPayload {
  telegram_chat_id: number;
  order_id: number;
  receipt_number: string;
  status: OrderStatus;
  total_amount: number;
  items?: OrderItem[];
}

export interface PaymentNotificationPayload {
  telegram_chat_id: number;
  order_id: number;
  receipt_number: string;
  payment_status: 'success' | 'failed' | 'expired';
  amount: number;
  method: string;
}

export interface RewardNotificationPayload {
  telegram_chat_id: number;
  customer_name: string;
  points_earned: number;
  total_points: number;
  tier: string;
}
