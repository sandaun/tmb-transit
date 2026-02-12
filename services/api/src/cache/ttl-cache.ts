interface CacheEntry<T> {
  value: T;
  storedAt: number;
  expiresAt: number;
}

export class TtlCache<T> {
  private readonly entries = new Map<string, CacheEntry<T>>();

  getFresh(key: string, now = Date.now()): T | null {
    const entry = this.entries.get(key);
    if (!entry) {
      return null;
    }

    if (entry.expiresAt <= now) {
      return null;
    }

    return entry.value;
  }

  getStale(key: string, maxAgeMs: number, now = Date.now()): T | null {
    const entry = this.entries.get(key);
    if (!entry) {
      return null;
    }

    if (now - entry.storedAt > maxAgeMs) {
      return null;
    }

    return entry.value;
  }

  set(key: string, value: T, ttlMs: number, now = Date.now()): void {
    this.entries.set(key, {
      value,
      storedAt: now,
      expiresAt: now + ttlMs,
    });
  }
}
