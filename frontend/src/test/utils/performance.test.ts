import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { debounce, throttle, memoize, createLRUCache } from '@/utils/performance'

describe('debounce', () => {
  beforeEach(() => { vi.useFakeTimers() })
  afterEach(() => { vi.useRealTimers() })

  it('应在延迟后调用函数', () => {
    const fn = vi.fn()
    const debounced = debounce(fn, 100)
    debounced()
    expect(fn).not.toHaveBeenCalled()
    vi.advanceTimersByTime(100)
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('应在连续调用时只执行最后一次', () => {
    const fn = vi.fn()
    const debounced = debounce(fn, 100)
    debounced('a')
    debounced('b')
    debounced('c')
    vi.advanceTimersByTime(100)
    expect(fn).toHaveBeenCalledTimes(1)
    expect(fn).toHaveBeenCalledWith('c')
  })

  it('应在延迟期间重置计时器', () => {
    const fn = vi.fn()
    const debounced = debounce(fn, 100)
    debounced()
    vi.advanceTimersByTime(50)
    debounced()
    vi.advanceTimersByTime(50)
    expect(fn).not.toHaveBeenCalled()
    vi.advanceTimersByTime(50)
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('应支持传递参数', () => {
    const fn = vi.fn()
    const debounced = debounce(fn, 50)
    debounced(1, 2, 3)
    vi.advanceTimersByTime(50)
    expect(fn).toHaveBeenCalledWith(1, 2, 3)
  })

  it('应在零延迟时立即执行', () => {
    const fn = vi.fn()
    const debounced = debounce(fn, 0)
    debounced()
    vi.advanceTimersByTime(0)
    expect(fn).toHaveBeenCalledTimes(1)
  })
})

describe('throttle', () => {
  beforeEach(() => { vi.useFakeTimers() })
  afterEach(() => { vi.useRealTimers() })

  it('应在间隔内立即执行第一次调用', () => {
    const fn = vi.fn()
    const throttled = throttle(fn, 100)
    throttled()
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('应在间隔内限制调用频率', () => {
    const fn = vi.fn()
    const throttled = throttle(fn, 100)
    throttled('a')
    throttled('b')
    throttled('c')
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('应在间隔结束后允许再次调用', () => {
    const fn = vi.fn()
    const throttled = throttle(fn, 100)
    throttled('a')
    vi.advanceTimersByTime(100)
    throttled('b')
    expect(fn).toHaveBeenCalledTimes(2)
  })

  it('应在尾部调用中保留最后一次参数', () => {
    const fn = vi.fn()
    const throttled = throttle(fn, 100)
    throttled('a')
    throttled('b')
    vi.advanceTimersByTime(100)
    expect(fn).toHaveBeenCalledTimes(2)
    expect(fn).toHaveBeenLastCalledWith('b')
  })
})

describe('memoize', () => {
  it('应缓存函数结果', () => {
    const fn = vi.fn((x: number) => x * 2)
    const memoized = memoize(fn)
    expect(memoized(5)).toBe(10)
    expect(memoized(5)).toBe(10)
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('应区分不同参数', () => {
    const fn = vi.fn((x: number) => x * 2)
    const memoized = memoize(fn)
    memoized(1)
    memoized(2)
    expect(fn).toHaveBeenCalledTimes(2)
  })

  it('应在缓存满时淘汰最旧条目', () => {
    const fn = vi.fn((x: number) => x)
    const memoized = memoize(fn, 3)
    memoized(1)
    memoized(2)
    memoized(3)
    memoized(4)
    expect(fn).toHaveBeenCalledTimes(4)
    fn.mockClear()
    memoized(1)
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('应处理对象参数', () => {
    const fn = vi.fn((obj: { a: number }) => obj.a)
    const memoized = memoize(fn)
    memoized({ a: 1 })
    memoized({ a: 1 })
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('默认缓存大小应为50', () => {
    const fn = vi.fn((x: number) => x)
    const memoized = memoize(fn)
    for (let i = 0; i < 60; i++) memoized(i)
    fn.mockClear()
    memoized(0)
    expect(fn).toHaveBeenCalledTimes(1)
  })
})

describe('createLRUCache', () => {
  it('应存储和获取值', () => {
    const cache = createLRUCache<string, number>()
    cache.set('a', 1)
    expect(cache.get('a')).toBe(1)
  })

  it('应在键不存在时返回 undefined', () => {
    const cache = createLRUCache<string, number>()
    expect(cache.get('nonexistent')).toBeUndefined()
  })

  it('应更新已存在的键', () => {
    const cache = createLRUCache<string, number>()
    cache.set('a', 1)
    cache.set('a', 2)
    expect(cache.get('a')).toBe(2)
    expect(cache.size).toBe(1)
  })

  it('应在达到最大容量时淘汰最旧条目', () => {
    const cache = createLRUCache<string, number>(3)
    cache.set('a', 1)
    cache.set('b', 2)
    cache.set('c', 3)
    cache.set('d', 4)
    expect(cache.get('a')).toBeUndefined()
    expect(cache.get('d')).toBe(4)
    expect(cache.size).toBe(3)
  })

  it('应在获取时更新访问顺序', () => {
    const cache = createLRUCache<string, number>(3)
    cache.set('a', 1)
    cache.set('b', 2)
    cache.set('c', 3)
    cache.get('a')
    cache.set('d', 4)
    expect(cache.get('a')).toBe(1)
    expect(cache.get('b')).toBeUndefined()
  })

  it('应支持删除键', () => {
    const cache = createLRUCache<string, number>()
    cache.set('a', 1)
    expect(cache.delete('a')).toBe(true)
    expect(cache.get('a')).toBeUndefined()
    expect(cache.delete('a')).toBe(false)
  })

  it('应支持清空缓存', () => {
    const cache = createLRUCache<string, number>()
    cache.set('a', 1)
    cache.set('b', 2)
    cache.clear()
    expect(cache.size).toBe(0)
    expect(cache.get('a')).toBeUndefined()
  })

  it('应正确报告 has 方法', () => {
    const cache = createLRUCache<string, number>()
    cache.set('a', 1)
    expect(cache.has('a')).toBe(true)
    expect(cache.has('b')).toBe(false)
  })

  it('默认最大容量应为100', () => {
    const cache = createLRUCache<string, number>()
    for (let i = 0; i < 110; i++) cache.set(`key-${i}`, i)
    expect(cache.size).toBe(100)
  })
})
