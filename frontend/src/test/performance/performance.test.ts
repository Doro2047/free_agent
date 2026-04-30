import { describe, it, expect, vi } from 'vitest'
import { debounce, throttle, memoize, createLRUCache } from '@/utils/performance'
import { createAPICache } from '@/utils/apiCache'
import { formatFileSize, extractQuantization } from '@/api/models'

describe('性能测试', () => {
  describe('debounce 性能', () => {
    it('应在高频调用时只执行一次', () => {
      vi.useFakeTimers()
      const fn = vi.fn()
      const debounced = debounce(fn, 10)
      for (let i = 0; i < 10000; i++) debounced(i)
      vi.advanceTimersByTime(10)
      expect(fn).toHaveBeenCalledTimes(1)
      vi.useRealTimers()
    })
  })

  describe('throttle 性能', () => {
    it('应限制高频调用', () => {
      vi.useFakeTimers()
      const fn = vi.fn()
      const throttled = throttle(fn, 10)
      for (let i = 0; i < 10000; i++) throttled(i)
      expect(fn.mock.calls.length).toBeLessThanOrEqual(2)
      vi.useRealTimers()
    })
  })

  describe('memoize 性能', () => {
    it('应在缓存命中时避免重复计算', () => {
      let callCount = 0
      const expensiveFn = (x: number) => { callCount++; return x * x }
      const memoized = memoize(expensiveFn, 1000)
      for (let i = 0; i < 100; i++) {
        for (let j = 0; j < 100; j++) memoized(j)
      }
      expect(callCount).toBe(100)
    })
  })

  describe('LRU 缓存性能', () => {
    it('应在大量数据下保持性能', () => {
      const cache = createLRUCache<number, number>(10000)
      const start = performance.now()
      for (let i = 0; i < 100000; i++) cache.set(i, i * 2)
      const setTime = performance.now() - start
      expect(setTime).toBeLessThan(1000)

      const startGet = performance.now()
      for (let i = 90000; i < 100000; i++) cache.get(i)
      const getTime = performance.now() - startGet
      expect(getTime).toBeLessThan(500)
    })
  })

  describe('API 缓存性能', () => {
    it('应在 TTL 内快速返回缓存数据', () => {
      const cache = createAPICache(1000, 30000)
      for (let i = 0; i < 1000; i++) cache.set(`/api/item/${i}`, { data: i })
      const start = performance.now()
      for (let i = 0; i < 1000; i++) cache.get(`/api/item/${i}`)
      const getTime = performance.now() - start
      expect(getTime).toBeLessThan(100)
    })
  })

  describe('formatFileSize 性能', () => {
    it('应在大量调用下保持性能', () => {
      const start = performance.now()
      for (let i = 0; i < 100000; i++) formatFileSize(i * 1024)
      const time = performance.now() - start
      expect(time).toBeLessThan(500)
    })
  })

  describe('extractQuantization 性能', () => {
    it('应在大量调用下保持性能', () => {
      const start = performance.now()
      for (let i = 0; i < 100000; i++) extractQuantization(`model-${i}.Q8_0.gguf`)
      const time = performance.now() - start
      expect(time).toBeLessThan(500)
    })
  })
})
