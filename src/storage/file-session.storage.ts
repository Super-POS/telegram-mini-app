import type { StorageAdapter } from 'grammy';
import fs from 'fs';
import path from 'path';

/**
 * A minimal file-backed StorageAdapter for grammY sessions.
 * All sessions are stored in a single JSON file on disk so they
 * survive bot restarts during development and production.
 */
export class FileSessionStorage<T> implements StorageAdapter<T> {
  private readonly filePath: string;
  private data: Record<string, T> = {};
  private dirty = false;
  private flushTimer: NodeJS.Timeout | null = null;

  constructor(filePath: string) {
    this.filePath = path.resolve(filePath);
    this.load();
  }

  private load(): void {
    try {
      if (fs.existsSync(this.filePath)) {
        const raw = fs.readFileSync(this.filePath, 'utf-8');
        this.data = JSON.parse(raw) as Record<string, T>;
      }
    } catch {
      this.data = {};
    }
  }

  private flush(): void {
    try {
      const dir = path.dirname(this.filePath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(this.filePath, JSON.stringify(this.data, null, 2), 'utf-8');
      this.dirty = false;
    } catch (err) {
      console.error('[FileSessionStorage] Failed to persist sessions:', err);
    }
  }

  /** Debounced write — batches rapid successive writes into one disk op */
  private scheduleFlush(): void {
    this.dirty = true;
    if (this.flushTimer) clearTimeout(this.flushTimer);
    this.flushTimer = setTimeout(() => {
      if (this.dirty) this.flush();
    }, 200);
  }

  async read(key: string): Promise<T | undefined> {
    return this.data[key];
  }

  async write(key: string, value: T): Promise<void> {
    this.data[key] = value;
    this.scheduleFlush();
  }

  async delete(key: string): Promise<void> {
    delete this.data[key];
    this.scheduleFlush();
  }
}
