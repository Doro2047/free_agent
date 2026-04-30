import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createAPICache } from '@/utils/apiCache'

describe('createAPICache', () => {
  let cache: ReturnType<typeof createAPICache>

  beforeEach(() => {
    cache = createAPICache(5, 1000)
  })

  it('应存储和获取数据', () => {
    cache.set('/api/test', { data: 'hello' })
    expect(cache.get('/api/test')).toEqual({ data: 'hello' })
  })

  it('应在键不存在时返回 null', () => {
    expect(cache.get('/api/nonexistent')).toBeNull()
  })

  it('应支持带参数的缓存键', () => {
    cache.set('/api/test', { data: 'a' }, { page: 1 })
    cache.set('/api/test', { data: 'b' }, { page: 2 })
    expect(cache.get('/api/test', { page: 1 })).toEqual({ data: 'a' })
    expect(cache.get('/api/test', { page: 2 })).toEqual({ data: 'b' })
  })

  it('应在 TTL 过期后返回 null', () => {
    vi.useFakeTimers()
    cache.set('/api/test', { data: 'hello' })
    expect(cache.get('/api/test')).toEqual({ data: 'hello' })
    vi.advanceTimersByTime(1001)
    expect(cache.get('/api/test')).toBeNull()
    vi.useRealTimers()
  })

  it('应支持自定义 TTL', () => {
    vi.useFakeTimers()
    cache.set('/api/test', { data: 'hello' }, undefined, 5000)
    vi.advanceTimersByTime(1001)
    expect(cache.get('/api/test')).toEqual({ data: 'hello' })
    vi.useRealTimers()
  })

  it('应支持 invalidate 单个缓存', () => {
    cache.set('/api/test', { data: 'hello' })
    cache.invalidate('/api/test')
    expect(cache.get('/api/test')).toBeNull()
  })

  it('应支持 invalidatePattern 清空所有缓存', () => {
    cache.set('/api/a', { data: 'a' })
    cache.set('/api/b', { data: 'b' })
    cache.invalidatePattern('/api/')
    expect(cache.get('/api/a')).toBeNull()
    expect(cache.get('/api/b')).toBeNull()
  })

  it('应支持 clear 清空所有缓存', () => {
    cache.set('/api/a', { data: 'a' })
    cache.set('/api/b', { data: 'b' })
    cache.clear()
    expect(cache.size).toBe(0)
  })

  it('应正确报告 size', () => {
    expect(cache.size).toBe(0)
    cache.set('/api/a', { data: 'a' })
    expect(cache.size).toBe(1)
    cache.set('/api/b', { data: 'b' })
    expect(cache.size).toBe(2)
  })

  it('应在达到最大容量时淘汰旧条目', () => {
    for (let i = 0; i < 6; i++) {
      cache.set(`/api/item-${i}`, { data: i })
    }
    expect(cache.get('/api/item-0')).toBeNull()
    expect(cache.get('/api/item-5')).toEqual({ data: 5 })
  })
})
