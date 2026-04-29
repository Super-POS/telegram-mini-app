import { apiClient, withAuth } from './client';
import type { ApiResponse, MenuCategory } from '../types';

/** Fetch all menus grouped by category (public, no auth). */
export async function getPublicMenus(): Promise<MenuCategory[]> {
  const res = await apiClient.get<ApiResponse<MenuCategory[]>>('/api/share/menus');
  return res.data.data ?? [];
}

/** Back-compat: keep old name but use public endpoint to avoid auth issues. */
export async function getOrderingMenus(_token: string): Promise<MenuCategory[]> {
  return await getPublicMenus();
}
