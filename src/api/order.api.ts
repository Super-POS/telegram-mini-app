import { apiClient, withAuth } from './client';
import type { ApiResponse, Order } from '../types';

export interface PlaceOrderPayload {
  cart: string; // JSON-stringified array of { menu_id, quantity }
  channel: string;
  customer_note?: string;
}

export async function placeOrder(
  token: string,
  payload: PlaceOrderPayload,
): Promise<Order> {
  const res = await apiClient.post<ApiResponse<Order>>(
    '/api/customer/orders',
    payload,
    withAuth(token),
  );
  if (!res.data.data) throw new Error(res.data.message ?? 'Failed to place order');
  return res.data.data;
}

export async function getOrder(token: string, orderId: number): Promise<Order> {
  const res = await apiClient.get<ApiResponse<Order>>(
    `/api/customer/orders/${orderId}`,
    withAuth(token),
  );
  if (!res.data.data) throw new Error(res.data.message ?? 'Order not found');
  return res.data.data;
}

export async function getOrderHistory(
  token: string,
  page = 1,
  limit = 5,
): Promise<Order[]> {
  const res = await apiClient.get<ApiResponse<Order[]>>(
    `/api/customer/orders?page=${page}&limit=${limit}`,
    withAuth(token),
  );
  return res.data.data ?? [];
}
