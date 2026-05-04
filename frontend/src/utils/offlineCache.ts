export interface CacheOptions {
  ttl?: number;
  storageKey?: string;
  maxSize?: number;
}

export interface CacheEntry<T> {
  value: T;
  timestamp: number;
  ttl: number;
}

export class OfflineCache {
  private storage: Storage;
  private prefix: string;
  private defaultTTL: number;
  private maxSize: number;

  constructor(options: CacheOptions = {}) {
    this.storage = options.storageKey ? localStorage : localStorage;
    this.prefix = options.storageKey || 'codecraft-cache';
    this.defaultTTL = options.ttl || 24 * 60 * 60 * 1000;
    this.maxSize = options.maxSize || 50 * 1024 * 1024;
  }

  private getKey(key: string): string {
    return `${this.prefix}:${key}`;
  }

  private isExpired(entry: CacheEntry<unknown>): boolean {
    if (entry.ttl === 0) return false;
    return Date.now() - entry.timestamp > entry.ttl;
  }

  set<T>(key: string, value: T, ttl?: number): void {
    try {
      const entry: CacheEntry<T> = {
        value,
        timestamp: Date.now(),
        ttl: ttl || this.defaultTTL,
      };

      const serialized = JSON.stringify(entry);
      const size = new Blob([serialized]).size;

      if (size > this.maxSize) {
        console.warn(`[OfflineCache] 缓存项 ${key} 超过最大大小限制`);
        return;
      }

      this.storage.setItem(this.getKey(key), serialized);
      this.cleanup();
    } catch (error) {
      console.error(`[OfflineCache] 设置缓存失败 ${key}:`, error);
    }
  }

  get<T>(key: string): T | null {
    try {
      const item = this.storage.getItem(this.getKey(key));
      if (!item) return null;

      const entry: CacheEntry<T> = JSON.parse(item);

      if (this.isExpired(entry)) {
        this.delete(key);
        return null;
      }

      return entry.value;
    } catch (error) {
      console.error(`[OfflineCache] 获取缓存失败 ${key}:`, error);
      return null;
    }
  }

  has(key: string): boolean {
    const value = this.get(key);
    return value !== null;
  }

  delete(key: string): void {
    this.storage.removeItem(this.getKey(key));
  }

  clear(): void {
    const keys = this.keys();
    keys.forEach((key) => this.delete(key));
  }

  keys(): string[] {
    const allKeys: string[] = [];
    for (let i = 0; i < this.storage.length; i++) {
      const key = this.storage.key(i);
      if (key && key.startsWith(this.prefix)) {
        allKeys.push(key.replace(`${this.prefix}:`, ''));
      }
    }
    return allKeys;
  }

  private cleanup(): void {
    const entries: Array<{ key: string; size: number; timestamp: number }> = [];

    for (let i = 0; i < this.storage.length; i++) {
      const key = this.storage.key(i);
      if (key && key.startsWith(this.prefix)) {
        try {
          const item = this.storage.getItem(key);
          if (item) {
            const parsed = JSON.parse(item);
            entries.push({
              key: key.replace(`${this.prefix}:`, ''),
              size: new Blob([item]).size,
              timestamp: parsed.timestamp,
            });
          }
        } catch {
          this.storage.removeItem(key);
        }
      }
    }

    entries.sort((a, b) => a.timestamp - b.timestamp);

    let totalSize = entries.reduce((sum, entry) => sum + entry.size, 0);
    const maxEntries = 1000;

    for (const entry of entries) {
      if (entries.length > maxEntries || totalSize > this.maxSize) {
        this.delete(entry.key);
        totalSize -= entry.size;
      } else {
        const fullKey = this.getKey(entry.key);
        const item = this.storage.getItem(fullKey);
        if (item) {
          const parsed = JSON.parse(item);
          if (this.isExpired(parsed)) {
            this.delete(entry.key);
          }
        }
      }
    }
  }

  size(): number {
    let total = 0;
    for (let i = 0; i < this.storage.length; i++) {
      const key = this.storage.key(i);
      if (key && key.startsWith(this.prefix)) {
        const item = this.storage.getItem(key);
        if (item) {
          total += new Blob([item]).size;
        }
      }
    }
    return total;
  }

  async getOrSet<T>(
    key: string,
    factory: () => Promise<T>,
    ttl?: number
  ): Promise<T> {
    const cached = this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    const value = await factory();
    this.set(key, value, ttl);
    return value;
  }

  invalidate(pattern: RegExp): void {
    const keys = this.keys();
    keys.forEach((key) => {
      if (pattern.test(key)) {
        this.delete(key);
      }
    });
  }

  stats(): {
    totalKeys: number;
    totalSize: number;
    expiredKeys: number;
  } {
    const keys = this.keys();
    let expiredKeys = 0;
    let totalSize = 0;

    for (const key of keys) {
      const fullKey = this.getKey(key);
      const item = this.storage.getItem(fullKey);
      if (item) {
        totalSize += new Blob([item]).size;
        try {
          const parsed = JSON.parse(item);
          if (this.isExpired(parsed)) {
            expiredKeys++;
          }
        } catch {
          expiredKeys++;
        }
      }
    }

    return {
      totalKeys: keys.length,
      totalSize,
      expiredKeys,
    };
  }
}

export const defaultCache = new OfflineCache({
  storageKey: 'codecraft-cache',
  ttl: 24 * 60 * 60 * 1000,
  maxSize: 50 * 1024 * 1024,
});

export const apiCache = new OfflineCache({
  storageKey: 'codecraft-api-cache',
  ttl: 60 * 60 * 1000,
  maxSize: 20 * 1024 * 1024,
});

export const modelCache = new OfflineCache({
  storageKey: 'codecraft-model-cache',
  ttl: 7 * 24 * 60 * 60 * 1000,
  maxSize: 100 * 1024 * 1024,
});

export class ServiceWorkerCache {
  private cacheName: string;
  private cache: Cache | null = null;

  constructor(name: string) {
    this.cacheName = `codecraft-${name}`;
  }

  async open(): Promise<Cache> {
    if (!this.cache) {
      this.cache = await caches.open(this.cacheName);
    }
    return this.cache;
  }

  async match(request: RequestInfo): Promise<Response | undefined> {
    const cache = await this.open();
    return cache.match(request);
  }

  async put(request: RequestInfo, response: Response): Promise<void> {
    const cache = await this.open();
    await cache.put(request, response.clone());
  }

  async delete(request: RequestInfo): Promise<boolean> {
    const cache = await this.open();
    return cache.delete(request);
  }

  async clear(): Promise<void> {
    await caches.delete(this.cacheName);
    this.cache = null;
  }

  async keys(): Promise<Request[]> {
    const cache = await this.open();
    return cache.keys();
  }

  async has(request: RequestInfo): Promise<boolean> {
    const response = await this.match(request);
    return response !== undefined;
  }
}

export const staticAssetsCache = new ServiceWorkerCache('static-assets');
export const apiResponseCache = new ServiceWorkerCache('api-responses');
export const modelDataCache = new ServiceWorkerCache('model-data');

export interface OfflineData<T> {
  data: T;
  timestamp: number;
  version: string;
}

export class OfflineStorage<T> {
  private key: string;
  private version: string;
  private cache: OfflineCache;

  constructor(key: string, version: string = '1.0.0') {
    this.key = key;
    this.version = version;
    this.cache = new OfflineCache({ storageKey: `codecraft-offline-${key}` });
  }

  async save(data: T): Promise<void> {
    const offlineData: OfflineData<T> = {
      data,
      timestamp: Date.now(),
      version: this.version,
    };
    this.cache.set('data', offlineData, 0);
  }

  async load(): Promise<T | null> {
    const offlineData = this.cache.get<OfflineData<T>>('data');
    if (!offlineData) return null;

    if (offlineData.version !== this.version) {
      console.warn(
        `[OfflineStorage] 数据版本不匹配: ${offlineData.version} -> ${this.version}`
      );
      this.cache.delete('data');
      return null;
    }

    return offlineData.data;
  }

  async hasData(): Promise<boolean> {
    const data = await this.load();
    return data !== null;
  }

  clear(): void {
    this.cache.clear();
  }

  async sync(
    fetchData: () => Promise<T>,
    onConflict?: (local: T, remote: T) => Promise<T>
  ): Promise<{ data: T; isStale: boolean }> {
    const localData = await this.load();

    try {
      const remoteData = await fetchData();

      if (localData === null) {
        await this.save(remoteData);
        return { data: remoteData, isStale: false };
      }

      if (onConflict) {
        const resolvedData = await onConflict(localData, remoteData);
        await this.save(resolvedData);
        return { data: resolvedData, isStale: false };
      }

      await this.save(remoteData);
      return { data: remoteData, isStale: false };
    } catch (error) {
      console.error('[OfflineStorage] 同步失败:', error);
      if (localData !== null) {
        return { data: localData, isStale: true };
      }
      throw error;
    }
  }
}

export const offlineConfigStorage = new OfflineStorage<Record<string, unknown>>(
  'config',
  '1.0.0'
);
export const offlineModelListStorage = new OfflineStorage<unknown[]>(
  'model-list',
  '1.0.0'
);
export const offlineChatHistoryStorage = new OfflineStorage<unknown[]>(
  'chat-history',
  '1.0.0'
);

export async function isOnline(): Promise<boolean> {
  return navigator.onLine;
}

export async function waitForOnline(): Promise<void> {
  if (navigator.onLine) return;
  return new Promise((resolve) => {
    const handler = () => {
      window.removeEventListener('online', handler);
      resolve();
    };
    window.addEventListener('online', handler);
  });
}

export class NetworkStatus {
  private listeners: Set<(online: boolean) => void> = new Set();
  private isOnline: boolean = navigator.onLine;

  constructor() {
    window.addEventListener('online', () => this.handleOnline());
    window.addEventListener('offline', () => this.handleOffline());
  }

  private handleOnline(): void {
    this.isOnline = true;
    this.notifyListeners();
  }

  private handleOffline(): void {
    this.isOnline = false;
    this.notifyListeners();
  }

  private notifyListeners(): void {
    this.listeners.forEach((listener) => listener(this.isOnline));
  }

  subscribe(listener: (online: boolean) => void): () => void {
    this.listeners.add(listener);
    listener(this.isOnline);
    return () => this.listeners.delete(listener);
  }

  get status(): boolean {
    return this.isOnline;
  }

  destroy(): void {
    this.listeners.clear();
    window.removeEventListener('online', () => this.handleOnline());
    window.removeEventListener('offline', () => this.handleOffline());
  }
}

export const networkStatus = new NetworkStatus();

export function createOfflineAwareFetch<T>(
  url: string,
  options?: RequestInit,
  offlineFallback?: () => Promise<T>
): {
  fetch: () => Promise<T>;
  isOffline: () => boolean;
} {
  let isOffline = !navigator.onLine;

  const updateStatus = (): void => {
    isOffline = !navigator.onLine;
  };

  window.addEventListener('online', updateStatus);
  window.addEventListener('offline', updateStatus);

  return {
    isOffline: () => isOffline,
    fetch: async (): Promise<T> => {
      if (!navigator.onLine) {
        if (offlineFallback) {
          return offlineFallback();
        }
        throw new Error('网络不可用');
      }

      const response = await fetch(url, options);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      return response.json();
    },
  };
}
