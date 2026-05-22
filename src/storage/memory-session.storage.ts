import type { StorageAdapter } from 'grammy';

/** In-memory sessions for serverless (e.g. Vercel). Prefer Postgres in production. */
export class MemorySessionStorage<T> implements StorageAdapter<T> {
  private readonly data = new Map<string, T>();

  async read(key: string): Promise<T | undefined> {
    return this.data.get(key);
  }

  async write(key: string, value: T): Promise<void> {
    this.data.set(key, value);
  }

  async delete(key: string): Promise<void> {
    this.data.delete(key);
  }
}
