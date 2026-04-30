import { createLRUCache } from '@/utils/performance'

interface CacheEntry<T> {
  data: T
  timestamp: number
  ttl: number
  url: string
}

export function createAPICache(maxSize: number = 50, defaultTTL: number = 30000) {
  const cache = createLRUCache<string, CacheEntry<unknown>>(maxSize)
  const keyToUrl = new Map<string, string>()

  function buildKey(url: string, params?: Record<string, unknown>): string {
    return params ? `${url}?${JSON.stringify(params)}` : url
  }

  function isExpired(entry: CacheEntry<unknown>): boolean {
    return Date.now() - entry.timestamp > entry.ttl
  }

  return {
    get<T>(url: string, params?: Record<string, unknown>): T | null {
      const key = buildKey(url, params)
      const entry = cache.get(key)
      if (!entry) return null
      if (isExpired(entry)) {
        cache.delete(key)
        keyToUrl.delete(key)
        return null
      }
      return entry.data as T
    },

    set<T>(url: string, data: T, params?: Record<string, unknown>, ttl?: number): void {
      const key = buildKey(url, params)
      cache.set(key, { data, timestamp: Date.now(), ttl: ttl ?? defaultTTL, url })
      keyToUrl.set(key, url)
    },

    invalidate(url: string, params?: Record<string, unknown>): void {
      const key = buildKey(url, params)
      cache.delete(key)
      keyToUrl.delete(key)
    },

    invalidatePattern(pattern: string): void {
      const prefix = pattern.replace(/\/$/, '')
      const keysToDelete: string[] = []

      for (const [key, entryUrl] of keyToUrl.entries()) {
        if (entryUrl === prefix || entryUrl.startsWith(`${prefix}/`) || entryUrl.startsWith(`${prefix}?`)) {
          keysToDelete.push(key)
        }
      }

      for (const key of keysToDelete) {
        cache.delete(key)
        keyToUrl.delete(key)
      }
    },

    clear(): void {
      cache.clear()
      keyToUrl.clear()
    },

    get size(): number {
      return cache.size
    },

    cleanup(): number {
      let removed = 0
      const keysToDelete: string[] = []

      for (const [key] of keyToUrl.entries()) {
        const entry = cache.get(key)
        if (entry && isExpired(entry)) {
          keysToDelete.push(key)
        }
      }

      for (const key of keysToDelete) {
        cache.delete(key)
        keyToUrl.delete(key)
        removed++
      }

      return removed
    },
  }
}

export const apiCache = createAPICache()

if (typeof globalThis !== 'undefined') {
  setInterval(() => {
    apiCache.cleanup()
  }, 60_000)
}
