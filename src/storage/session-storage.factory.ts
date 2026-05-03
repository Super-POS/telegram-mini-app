import type { StorageAdapter } from 'grammy';
import path from 'path';
import { getSessionPostgresConfig } from '../config';
import type { SessionData } from '../types';
import { FileSessionStorage } from './file-session.storage';
import { PostgresSessionStorage } from './postgres-session.storage';

export type BotSessionStorage = StorageAdapter<SessionData> & {
  /** Present when using PostgreSQL — call on shutdown */
  close?: () => Promise<void>;
};

export function createSessionStorage(): BotSessionStorage {
  const pg = getSessionPostgresConfig();
  if (pg) {
    console.log('[session] Using PostgreSQL table telegram_bot_sessions');
    return new PostgresSessionStorage<SessionData>(pg);
  }

  const filePath = path.join(__dirname, '..', '..', 'data', 'sessions.json');
  console.log('[session] Using file storage:', filePath);
  return new FileSessionStorage<SessionData>(filePath);
}
