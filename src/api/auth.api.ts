import axios from 'axios';
import { apiClient } from './client';
import { config } from '../config';
import type { ApiResponse } from '../types';

const LOG = '[telegram-bot-signin]';

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

/** Registers or logs in customer by Telegram ID (api trusts caller via X-Telegram-Bot-Secret). */
export async function loginViaTelegramBot(from: {
  id: number;
  first_name?: string;
  last_name?: string;
  username?: string;
  is_bot?: boolean;
}): Promise<{ token: string }> {
  if (from.is_bot) {
    throw new Error('Cannot sign in as a bot account.');
  }
  const secretRaw = config.telegramBotServerSecret;
  const secret = secretRaw.trim();
  if (!secret) {
    console.error(`${LOG} abort: TELEGRAM_BOT_SERVER_SECRET empty after trim`);
    throw new Error('TELEGRAM_BOT_SERVER_SECRET is not set on the bot.');
  }

  const payload = {
    platform: 'TelegramBot',
    user: {
      id: from.id,
      first_name: from.first_name,
      last_name: from.last_name,
      username: from.username,
    },
  };

  const url = `${config.apiBaseUrl.replace(/\/$/, '')}/api/account/auth/telegram-bot`;
  console.log(
    `${LOG} POST ${url} telegram_user_id=${from.id} secretLen=${secret.length} rawSecretHadWhitespace=${secretRaw !== secret}`,
  );

  try {
    const res = await apiClient.post<{ token?: string; message?: string }>(
      '/api/account/auth/telegram-bot',
      payload,
      {
        headers: { 'X-Telegram-Bot-Secret': secret },
      },
    );
    const token = res.data?.token;
    if (!token) {
      console.error(`${LOG} HTTP ${res.status} body has no token`, res.data);
      throw new Error(res.data?.message ?? 'Telegram sign-in failed');
    }
    console.log(`${LOG} OK HTTP ${res.status} token received`);
    return { token };
  } catch (e: unknown) {
    if (axios.isAxiosError(e)) {
      const st = e.response?.status;
      const data = e.response?.data;
      console.error(`${LOG} HTTP error status=${st}`, {
        url: e.config?.baseURL ? `${e.config.baseURL}${e.config.url ?? ''}` : url,
        responseBody: data,
        axiosMessage: e.message,
      });
      let apiMsg: string | undefined;
      if (data && typeof data === 'object' && 'message' in data) {
        const m = (data as { message: unknown }).message;
        apiMsg = typeof m === 'string' ? m : Array.isArray(m) && typeof m[0] === 'string' ? m[0] : undefined;
      }
      throw new Error(apiMsg ?? e.message ?? 'Telegram sign-in failed');
    }
    console.error(`${LOG} non-Axios error`, e);
    throw new Error(e instanceof Error ? e.message : 'Telegram sign-in failed');
  }
}
