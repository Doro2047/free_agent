import { describe, it, expect, vi } from 'vitest'
import { debounce, throttle, memoize, createLRUCache } from '@/utils/performance'
import { createAPICache } from '@/utils/apiCache'
import { formatFileSize, extractQuantization } from '@/api/models'
import { useChatStore } from '@/stores/chatStore'
import { useAppStore } from '@/stores/appStore'
import { useConfigStore } from '@/stores/configStore'

vi.mock('@/api/chat', () => ({
  sendMessage: vi.fn().mockRejectedValue(new Error('Network error')),
  streamMessage: vi.fn(),
  getSessionMessages: vi.fn().mockRejectedValue(new Error('Network error')),
  listSessions: vi.fn().mockRejectedValue(new Error('Network error')),
}))

vi.mock('sonner', () => ({
  toast: { error: vi.fn(), success: vi.fn(), info: vi.fn(), warning: vi.fn() },
}))

describe('边界异常测试', () => {
  describe('工具函数边界', () => {
    it('debounce 应处理零延迟', () => {
      vi.useFakeTimers()
      const fn = vi.fn()
      const debounced = debounce(fn, 0)
      debounced()
      vi.advanceTimersByTime(0)
      expect(fn).toHaveBeenCalledTimes(1)
      vi.useRealTimers()
    })

    it('debounce 应处理负延迟', () => {
      vi.useFakeTimers()
      const fn = vi.fn()
      const debounced = debounce(fn, -1)
      debounced()
      vi.advanceTimersByTime(0)
      expect(fn).toHaveBeenCalledTimes(1)
      vi.useRealTimers()
    })

    it('throttle 应处理零间隔', () => {
      const fn = vi.fn()
      const throttled = throttle(fn, 0)
      throttled()
      expect(fn).toHaveBeenCalled()
    })

    it('memoize 应处理零缓存大小', () => {
      const fn = vi.fn((x: number) => x)
      const memoized = memoize(fn, 0)
      memoized(1)
      expect(fn).toHaveBeenCalledTimes(1)
    })

    it('LRU 缓存应处理零大小（实际仍可存储一项）', () => {
      const cache = createLRUCache<string, number>(0)
      cache.set('a', 1)
      expect(cache.get('a')).toBe(1)
    })

    it('LRU 缓存应处理负大小（实际仍可存储一项）', () => {
      const cache = createLRUCache<string, number>(-1)
      cache.set('a', 1)
      expect(cache.get('a')).toBe(1)
    })
  })

  describe('API 缓存边界', () => {
    it('应处理零 TTL', () => {
      vi.useFakeTimers()
      const cache = createAPICache(5, 0)
      cache.set('/test', { data: 'hello' })
      vi.advanceTimersByTime(1)
      expect(cache.get('/test')).toBeNull()
      vi.useRealTimers()
    })

    it('应处理极大 TTL', () => {
      const cache = createAPICache(5, Number.MAX_SAFE_INTEGER)
      cache.set('/test', { data: 'hello' })
      expect(cache.get('/test')).toEqual({ data: 'hello' })
    })

    it('应处理空 URL', () => {
      const cache = createAPICache()
      cache.set('', { data: 'empty' })
      expect(cache.get('')).toEqual({ data: 'empty' })
    })

    it('应处理 undefined params', () => {
      const cache = createAPICache()
      cache.set('/test', { data: 'no-params' }, undefined)
      expect(cache.get('/test', undefined)).toEqual({ data: 'no-params' })
    })
  })

  describe('formatFileSize 边界', () => {
    it('应处理 0', () => expect(formatFileSize(0)).toBe('0 B'))
    it('应处理 1', () => expect(formatFileSize(1)).toBe('1.00 B'))
    it('应处理负数', () => expect(typeof formatFileSize(-1)).toBe('string'))
    it('应处理 NaN', () => expect(typeof formatFileSize(NaN)).toBe('string'))
    it('应处理 Infinity', () => expect(typeof formatFileSize(Infinity)).toBe('string'))
    it('应处理小数', () => expect(typeof formatFileSize(1.5)).toBe('string'))
  })

  describe('extractQuantization 边界', () => {
    it('应处理空字符串', () => expect(extractQuantization('')).toBe('GGUF'))
    it('应处理无扩展名', () => expect(extractQuantization('model')).toBe('GGUF'))
    it('应处理多个量化标记', () => expect(extractQuantization('model.Q4_0.Q8_0.gguf')).toBe('Q4_0'))
    it('应处理大小写混合', () => expect(extractQuantization('model.q8_0.gguf')).toBe('Q8_0'))
  })

  describe('Store 边界', () => {
    it('chatStore 应处理空消息列表', () => {
      useChatStore.setState({ messages: [] })
      useChatStore.getState().appendToken('test')
      expect(useChatStore.getState().messages).toEqual([])
    })

    it('chatStore 应处理不存在的消息 ID 更新', () => {
      useChatStore.setState({ messages: [{ id: '1', role: 'user', content: 'hi', timestamp: Date.now() }] })
      useChatStore.getState().updateToolCalls('nonexistent', [])
      expect(useChatStore.getState().messages).toHaveLength(1)
    })

    it('appStore 应处理连续切换', () => {
      for (let i = 0; i < 100; i++) {
        useAppStore.getState().toggleSidebar()
      }
      expect(typeof useAppStore.getState().sidebarCollapsed).toBe('boolean')
    })

    it('configStore 应处理极端温度值', () => {
      useConfigStore.getState().setModelConfig({ temperature: 0 })
      expect(useConfigStore.getState().model.temperature).toBe(0)
      useConfigStore.getState().setModelConfig({ temperature: 2 })
      expect(useConfigStore.getState().model.temperature).toBe(2)
    })

    it('configStore 应处理空字符串 API Key', () => {
      useConfigStore.getState().setApiKey('deepseek', '')
      expect(useConfigStore.getState().apiKeys.deepseek).toBe('')
    })

    it('configStore 应处理超长 API Key', () => {
      const longKey = 'sk-' + 'a'.repeat(10000)
      useConfigStore.getState().setApiKey('deepseek', longKey)
      expect(useConfigStore.getState().apiKeys.deepseek).toBe(longKey)
    })
  })

  describe('网络异常', () => {
    it('chatStore 应处理加载历史失败', async () => {
      await useChatStore.getState().loadHistory('nonexistent')
      expect(useChatStore.getState().error).toBeTruthy()
    })

    it('chatStore 应处理加载会话列表失败', async () => {
      await useChatStore.getState().loadSessions()
    })
  })

  describe('并发冲突', () => {
    it('LRU 缓存应处理并发读写', () => {
      const cache = createLRUCache<number, number>(100)
      for (let i = 0; i < 1000; i++) {
        cache.set(i, i)
        cache.get(i)
      }
      expect(cache.size).toBe(100)
    })

    it('API 缓存应处理并发读写', () => {
      const cache = createAPICache(100)
      for (let i = 0; i < 1000; i++) {
        cache.set(`/api/${i}`, { data: i })
        cache.get(`/api/${i}`)
      }
      expect(cache.size).toBeLessThanOrEqual(100)
    })
  })
})
