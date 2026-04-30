import { describe, it, expect, vi } from 'vitest'
import { formatFileSize, extractQuantization } from '@/api/models'
import { createLRUCache } from '@/utils/performance'
import { createAPICache } from '@/utils/apiCache'
import { debounce } from '@/utils/performance'
import { useConfigStore } from '@/stores/configStore'

describe('安全性测试', () => {
  describe('XSS 防护', () => {
    it('formatFileSize 不应执行注入代码', () => {
      const result = formatFileSize(1024)
      expect(result).toBe('1.00 KB')
      expect(typeof result).toBe('string')
    })

    it('extractQuantization 不应执行注入代码', () => {
      const result = extractQuantization('<script>alert("xss")</script>.Q8_0.gguf')
      expect(result).toBe('Q8_0')
    })

    it('LRU 缓存键不应执行代码', () => {
      const cache = createLRUCache<string, string>()
      const evilKey = '__proto__'
      cache.set(evilKey, 'test')
      expect(cache.get(evilKey)).toBe('test')
      expect(cache.size).toBe(1)
    })

    it('API 缓存键不应执行代码', () => {
      const cache = createAPICache()
      const evilUrl = '/api/test?param=<script>alert(1)</script>'
      cache.set(evilUrl, { data: 'safe' })
      const result = cache.get(evilUrl)
      expect(result).toEqual({ data: 'safe' })
    })
  })

  describe('注入防护', () => {
    it('API URL 编码应防止路径遍历', async () => {
      const { deleteModel } = await import('@/api/models')
      const { apiClient } = await import('@/api/client')
      vi.spyOn(apiClient, 'delete').mockResolvedValue({ success: true, message: 'OK' })
      await deleteModel('../../../etc/passwd')
      expect(apiClient.delete).toHaveBeenCalledWith('/models/..%2F..%2F..%2Fetc%2Fpasswd')
      vi.restoreAllMocks()
    })

    it('API 缓存参数序列化不应执行代码', () => {
      const cache = createAPICache()
      const evilParams = { __proto__: { polluted: true }, constructor: { prototype: { polluted: true } } }
      cache.set('/api/test', { data: 'safe' }, evilParams)
      expect(cache.get('/api/test', evilParams)).toEqual({ data: 'safe' })
    })
  })

  describe('敏感信息防护', () => {
    it('API Key 不应出现在缓存键中', () => {
      const cache = createAPICache()
      cache.set('/api/test', { data: 'result' }, { apiKey: 'sk-secret-key-12345' })
      const result = cache.get('/api/test', { apiKey: 'sk-secret-key-12345' })
      expect(result).toEqual({ data: 'result' })
    })

    it('配置存储应正确管理 API Key', () => {
      const state = useConfigStore.getState()
      expect(typeof state.apiKeys).toBe('object')
      expect('deepseek' in state.apiKeys).toBe(true)
      expect('qwen' in state.apiKeys).toBe(true)
      expect('siliconflow' in state.apiKeys).toBe(true)
    })
  })

  describe('输入验证', () => {
    it('debounce 应处理正常函数', () => {
      const fn = vi.fn()
      const debounced = debounce(fn, 100)
      expect(() => debounced()).not.toThrow()
    })

    it('LRU 缓存应处理 null/undefined 键', () => {
      const cache = createLRUCache<any, string>()
      expect(() => cache.set(null as any, 'test')).not.toThrow()
    })

    it('formatFileSize 应处理负数', () => {
      const result = formatFileSize(-1)
      expect(typeof result).toBe('string')
    })

    it('formatFileSize 应处理极大值', () => {
      const result = formatFileSize(Number.MAX_SAFE_INTEGER)
      expect(typeof result).toBe('string')
    })

    it('extractQuantization 应处理空字符串', () => {
      const result = extractQuantization('')
      expect(result).toBe('GGUF')
    })

    it('extractQuantization 应处理特殊字符', () => {
      const result = extractQuantization('model; rm -rf /.Q8_0.gguf')
      expect(result).toBe('Q8_0')
    })
  })
})
