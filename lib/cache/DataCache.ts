// lib/cache/DataCache.ts
type CacheEntry<T> = {
  data: T;
  timestamp: number;
};

class DataCache {
  private static instance: DataCache;
  private cache: Map<string, CacheEntry<any>> = new Map();
  private readonly DEFAULT_TTL = 1000 * 60 * 5; // 5 minutes

  private constructor() {}

  public static getInstance(): DataCache {
    if (!DataCache.instance) {
      DataCache.instance = new DataCache();
    }
    return DataCache.instance;
  }

  set<T>(key: string, data: T): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
    });
  }

  get<T>(key: string, ttl: number = this.DEFAULT_TTL): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    const isExpired = Date.now() - entry.timestamp > ttl;
    if (isExpired) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  clear(key?: string): void {
    if (key) {
      this.cache.delete(key);
    } else {
      this.cache.clear();
    }
  }
}

export const dataCache = DataCache.getInstance();
