import { apiClient, withAuth } from './client';
import type { ApiResponse, WalletInfo, Deposit, RewardInfo, BadgeQuestion } from '../types';

export async function getWalletBalance(token: string): Promise<WalletInfo> {
  const res = await apiClient.get<ApiResponse<WalletInfo>>(
    '/api/customer/wallet',
    withAuth(token),
  );
  if (!res.data.data) throw new Error('Failed to fetch wallet');
  return res.data.data;
}

export interface DepositPayload {
  amount: number;
  reference: string;
  note?: string;
}

export async function requestDeposit(
  token: string,
  payload: DepositPayload,
): Promise<Deposit> {
  const res = await apiClient.post<ApiResponse<Deposit>>(
    '/api/customer/wallet/deposit',
    payload,
    withAuth(token),
  );
  if (!res.data.data) throw new Error(res.data.message ?? 'Deposit request failed');
  return res.data.data;
}

export async function getWalletHistory(
  token: string,
  page = 1,
  limit = 5,
) {
  const res = await apiClient.get<ApiResponse>(
    `/api/customer/wallet/history?page=${page}&limit=${limit}`,
    withAuth(token),
  );
  return res.data.data;
}

export async function getRewards(token: string): Promise<RewardInfo> {
  const res = await apiClient.get<ApiResponse<RewardInfo>>(
    '/api/customer/rewards',
    withAuth(token),
  );
  if (!res.data.data) throw new Error('Failed to fetch rewards');
  return res.data.data;
}

export async function getBadgeQuestions(token: string): Promise<BadgeQuestion[]> {
  const res = await apiClient.get<ApiResponse<BadgeQuestion[]>>(
    '/api/customer/rewards/badge/questions',
    withAuth(token),
  );
  return (res.data.data as BadgeQuestion[]) ?? [];
}

export async function assignBadge(token: string, answers: string[]): Promise<{ badge: string }> {
  const res = await apiClient.post<ApiResponse<{ badge: string }>>(
    '/api/customer/rewards/badge',
    { answers },
    withAuth(token),
  );
  if (!res.data.data) throw new Error(res.data.message ?? 'Badge assignment failed');
  return res.data.data;
}

export async function getCustomerProfile(token: string): Promise<Record<string, any> | undefined> {
  const res = await apiClient.get<ApiResponse>(
    '/api/customer/profile',
    withAuth(token),
  );
  return res.data.data as Record<string, any> | undefined;
}
