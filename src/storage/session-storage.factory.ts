import type { StorageAdapter } from 'grammy';
import path from 'path';
import { getSessionPostgresConfig } from '../config';
import type { SessionData } from '../types';
import { FileSessionStorage } from './file-session.storage';
import { MemorySessionStorage } from './memory-session.storage';
import { PostgresSessionStorage } from './postgres-session.storage';

export type BotSessionStorage = StorageAdapter<SessionData> & {
  /** Present when using PostgreSQL — call on shutdown */
  close?: () => Promise<void>;
};

export function createSessionStorage(): BotSessionStorage {
  const onVercel = process.env.VERCEL === '1';
  const pg = getSessionPostgresConfig();

  // Vercel cannot reach GCP Postgres on :9001 unless you open the firewall. Use memory by default.
  if (onVercel && process.env.SESSION_DB_FORCE !== '1') {
    console.log('[session] Vercel — in-memory sessions (set SESSION_DB_FORCE=1 if GCP Postgres is public)');
    return new MemorySessionStorage<SessionData>();
  }

  if (pg) {
    console.log('[session] Using PostgreSQL table telegram_bot_sessions');
    return new PostgresSessionStorage<SessionData>(pg);
  }

  const filePath = path.join(__dirname, '..', '..', 'data', 'sessions.json');
  console.log('[session] Using file storage:', filePath);
  return new FileSessionStorage<SessionData>(filePath);
}
