import { apiClient } from './client';
import type { ApiResponse } from '../types';

export interface LoginResponse {
  access_token: string;
  user?: {
    id: number;
    name: string;
    phone: string;
    email: string;
    roles: Array<{ id: number; name: string }>;
  };
}

export async function login(
  username: string,
  password: string,
): Promise<LoginResponse> {
  const res = await apiClient.post<any>(
    '/api/account/auth/login',
    { username, password, platform: 'Telegram' },
  );
  // API returns { token: "...", message: "..." }
  const token: string | undefined = res.data?.token ?? res.data?.data?.access_token ?? res.data?.access_token;
  if (!token) throw new Error(res.data?.message ?? 'Login failed');
  return { access_token: token, user: res.data?.user ?? res.data?.data?.user };
}

export async function checkUser(username: string): Promise<boolean> {
  try {
    const res = await apiClient.post<ApiResponse>('/api/account/auth/check-user', {
      username,
    });
    return res.data.success;
  } catch {
    return false;
  }
}

export async function register(payload: {
  name: string;
  phone: string;
  email: string;
  password: string;
}): Promise<void> {
  const res = await apiClient.post<ApiResponse>('/api/account/auth/register', payload);
  if (!res.data.success) throw new Error(res.data.message ?? 'Registration failed');
}
