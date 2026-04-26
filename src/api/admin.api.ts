import { apiClient, withAuth } from './client';
import type { ApiResponse, DashboardSummary, FinancialReport } from '../types';

export async function getDashboardSummary(token: string): Promise<DashboardSummary> {
  const res = await apiClient.get<ApiResponse<DashboardSummary>>(
    '/api/admin/dashboard',
    withAuth(token),
  );
  if (!res.data.data) throw new Error('Failed to fetch dashboard');
  return res.data.data;
}

export interface FinancialReportQuery {
  thisMonth?: 1;
  thisWeek?: 1;
  from?: string;
  to?: string;
  granularity?: 'daily' | 'weekly' | 'monthly';
}

export async function getFinancialReport(
  token: string,
  query: FinancialReportQuery = { thisMonth: 1, granularity: 'daily' },
): Promise<FinancialReport> {
  const entries = Object.entries(query)
    .filter(([, v]) => v !== undefined)
    .reduce<Record<string, string>>((acc, [k, v]) => { acc[k] = String(v); return acc; }, {});
  const params = new URLSearchParams(entries).toString();

  const res = await apiClient.get<ApiResponse<FinancialReport>>(
    `/api/admin/reports/financial?${params}`,
    withAuth(token),
  );
  if (!res.data.data) throw new Error('Failed to fetch financial report');
  return res.data.data;
}
