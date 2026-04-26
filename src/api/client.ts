import axios from 'axios';
import { config } from '../config';

export const apiClient = axios.create({
  baseURL: config.apiBaseUrl,
  timeout: 15_000,
  headers: { 'Content-Type': 'application/json' },
});

/** Attach a Bearer token to a one-off request */
export function withAuth(token: string) {
  return {
    headers: { Authorization: `Bearer ${token}` },
  };
}
