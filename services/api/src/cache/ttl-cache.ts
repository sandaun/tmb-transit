interface CacheEntry<T> {
  value: T;
  storedAt: number;
  expiresAt: number;
}

const DEFAULT_MAX_ENTRIES = 500;

export class TtlCache<T> {
  private readonly entries = new Map<string, CacheEntry<T>>();
  private readonly maxEntries: number;

  constructor(maxEntries: number = DEFAULT_MAX_ENTRIES) {
    this.maxEntries = Math.max(1, maxEntries);
  }

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
    // Re-inserting moves the key to the newest position so eviction stays FIFO
    // by last write, keeping the most recently refreshed keys.
    this.entries.delete(key);
    this.entries.set(key, {
      value,
      storedAt: now,
      expiresAt: now + ttlMs,
    });

    // Bound memory: unbounded keys (e.g. one per station) would otherwise grow
    // forever. Map iterates in insertion order, so the first key is the oldest.
    while (this.entries.size > this.maxEntries) {
      const oldestKey = this.entries.keys().next().value;
      if (oldestKey === undefined) {
        break;
      }
      this.entries.delete(oldestKey);
    }
  }
}
