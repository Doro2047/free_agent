import { describe, it, expect, vi } from 'vitest'
import { apiClient, ApiClientError } from '@/api/client'

vi.mock('sonner', () => ({
  toast: { error: vi.fn(), warning: vi.fn(), success: vi.fn() },
}))

describe('ApiClientError', () => {
  it('应正确创建错误对象', () => {
    const error = new ApiClientError('test error', 400, { error: 'bad request' })
    expect(error.message).toBe('test error')
    expect(error.status).toBe(400)
    expect(error.data).toEqual({ error: 'bad request' })
    expect(error.name).toBe('ApiClientError')
  })

  it('应支持无 status 和 data', () => {
    const error = new ApiClientError('unknown error')
    expect(error.message).toBe('unknown error')
    expect(error.status).toBeUndefined()
    expect(error.data).toBeUndefined()
  })

  it('应是 Error 的实例', () => {
    const error = new ApiClientError('test')
    expect(error).toBeInstanceOf(Error)
  })

  it('应支持仅 status', () => {
    const error = new ApiClientError('server error', 500)
    expect(error.status).toBe(500)
    expect(error.data).toBeUndefined()
  })
})

describe('apiClient 实例', () => {
  it('应存在 apiClient 单例', () => {
    expect(apiClient).toBeDefined()
  })

  it('应有默认重试次数', () => {
    expect(apiClient.defaultRetries).toBe(0)
  })

  it('应支持 setRetries', () => {
    apiClient.setRetries(3)
    expect(apiClient.defaultRetries).toBe(3)
    apiClient.setRetries(0)
  })

  it('应支持 clearCache', () => {
    expect(() => apiClient.clearCache()).not.toThrow()
  })

  it('应有 instance 属性', () => {
    expect(apiClient.instance).toBeDefined()
    expect(apiClient.instance.defaults.baseURL).toBeTruthy()
  })
})
