export function debounce<T extends (...args: unknown[]) => unknown>(
  fn: T,
  delay: number,
): (...args: Parameters<T>) => void {
  let timer: ReturnType<typeof setTimeout> | null = null
  return (...args: Parameters<T>) => {
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => {
      fn(...args)
      timer = null
    }, delay)
  }
}

export function throttle<T extends (...args: unknown[]) => unknown>(
  fn: T,
  interval: number,
): (...args: Parameters<T>) => void {
  let lastCall = 0
  let timer: ReturnType<typeof setTimeout> | null = null
  return (...args: Parameters<T>) => {
    const now = Date.now()
    const remaining = interval - (now - lastCall)
    if (remaining <= 0) {
      if (timer) { clearTimeout(timer); timer = null }
      lastCall = now
      fn(...args)
    } else if (!timer) {
      timer = setTimeout(() => {
        lastCall = Date.now()
        timer = null
        fn(...args)
      }, remaining)
    }
  }
}

export function memoize<Args extends unknown[], Return>(
  fn: (...args: Args) => Return,
  maxCacheSize: number = 50,
): (...args: Args) => Return {
  const cache = new Map<string, Return>()
  const keyOrder: string[] = []

  return (...args: Args): Return => {
    const key = JSON.stringify(args)
    if (cache.has(key)) return cache.get(key)!

    const result = fn(...args)
    cache.set(key, result)
    keyOrder.push(key)

    if (keyOrder.length > maxCacheSize) {
      const oldest = keyOrder.shift()!
      cache.delete(oldest)
    }

    return result
  }
}

export function createLRUCache<K, V>(maxSize: number = 100) {
  const cache = new Map<K, V>()

  return {
    get(key: K): V | undefined {
      if (!cache.has(key)) return undefined
      const value = cache.get(key)!
      cache.delete(key)
      cache.set(key, value)
      return value
    },
    set(key: K, value: V): void {
      if (cache.has(key)) cache.delete(key)
      else if (cache.size >= maxSize) {
        const firstKey = cache.keys().next().value
        if (firstKey !== undefined) cache.delete(firstKey)
      }
      cache.set(key, value)
    },
    has(key: K): boolean {
      return cache.has(key)
    },
    delete(key: K): boolean {
      return cache.delete(key)
    },
    clear(): void {
      cache.clear()
    },
    get size(): number {
      return cache.size
    },
  }
}
