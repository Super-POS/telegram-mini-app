import { apiClient, withAuth } from './client';
import type { ApiResponse, MenuCategory } from '../types';

/** Fetch all menus grouped by category — used by the cashier ordering endpoint */
export async function getOrderingMenus(token: string): Promise<MenuCategory[]> {
  const res = await apiClient.get<ApiResponse<MenuCategory[]>>(
    '/api/cashier/ordering/menus',
    withAuth(token),
  );
  return res.data.data ?? [];
}
