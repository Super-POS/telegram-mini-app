import type { StorageAdapter } from 'grammy';
import { Pool, type PoolConfig } from 'pg';

/**
 * grammY session persistence in PostgreSQL (same DB family as api-v1).
 * Table is created on first connect if missing.
 */
export class PostgresSessionStorage<T> implements StorageAdapter<T> {
  private readonly pool: Pool;
  private readonly ready: Promise<void>;

  constructor(poolConfig: PoolConfig) {
    this.pool = new Pool(poolConfig);
    this.ready = this.ensureTable();
  }

  private async ensureTable(): Promise<void> {
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS telegram_bot_sessions (
        session_key VARCHAR(512) PRIMARY KEY,
        session_data JSONB NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await this.pool.query(`
      CREATE INDEX IF NOT EXISTS idx_telegram_bot_sessions_updated_at ON telegram_bot_sessions (updated_at)
    `);
  }

  async read(key: string): Promise<T | undefined> {
    await this.ready;
    const r = await this.pool.query<{ session_data: T }>(
      'SELECT session_data FROM telegram_bot_sessions WHERE session_key = $1',
      [key],
    );
    if (!r.rows.length) return undefined;
    return r.rows[0].session_data;
  }

  async write(key: string, value: T): Promise<void> {
    await this.ready;
    await this.pool.query(
      `INSERT INTO telegram_bot_sessions (session_key, session_data, updated_at)
       VALUES ($1, $2::jsonb, NOW())
       ON CONFLICT (session_key) DO UPDATE SET
         session_data = EXCLUDED.session_data,
         updated_at = NOW()`,
      [key, JSON.stringify(value)],
    );
  }

  async delete(key: string): Promise<void> {
    await this.ready;
    await this.pool.query('DELETE FROM telegram_bot_sessions WHERE session_key = $1', [key]);
  }

  async close(): Promise<void> {
    await this.pool.end();
  }
}
