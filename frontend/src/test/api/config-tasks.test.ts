import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getConfig, updateConfig, resetConfig } from '@/api/config'
import { getTasks, createTask, deleteTask } from '@/api/tasks'
import { apiClient } from '@/api/client'

vi.mock('@/api/client', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    delete: vi.fn(),
    patch: vi.fn(),
    instance: { defaults: { baseURL: 'http://localhost:3000/api' } },
    clearCache: vi.fn(),
  },
}))

describe('config API', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('getConfig 应返回配置', async () => {
    const mockConfig = { theme: 'dark', model: { provider: 'local', model: 'qwen', temperature: 0.7, topP: 0.7, maxTokens: 4096, systemPrompt: '', stream: true, retries: 0 }, apiKeys: { deepseek: '', qwen: '', siliconflow: '' } }
    ;(apiClient.get as any).mockResolvedValue(mockConfig)
    const result = await getConfig()
    expect(apiClient.get).toHaveBeenCalledWith('/config')
    expect(result.theme).toBe('dark')
  })

  it('updateConfig 应更新配置', async () => {
    ;(apiClient.patch as any).mockResolvedValue({ theme: 'light' })
    await updateConfig({ theme: 'light' })
    expect(apiClient.patch).toHaveBeenCalledWith('/config', { theme: 'light' })
  })

  it('resetConfig 应重置配置', async () => {
    ;(apiClient.post as any).mockResolvedValue({ theme: 'dark' })
    await resetConfig()
    expect(apiClient.post).toHaveBeenCalledWith('/config/reset')
  })
})

describe('tasks API', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('getTasks 应返回任务列表', async () => {
    const mockTasks = [{ id: '1', name: 'Task 1', status: 'pending', progress: 0, createdAt: 1000, updatedAt: 1000 }]
    ;(apiClient.get as any).mockResolvedValue(mockTasks)
    const result = await getTasks()
    expect(apiClient.get).toHaveBeenCalledWith('/tasks')
    expect(result).toHaveLength(1)
  })

  it('createTask 应创建任务', async () => {
    const mockTask = { id: '2', name: 'New Task', status: 'pending', progress: 0, createdAt: 1000, updatedAt: 1000 }
    ;(apiClient.post as any).mockResolvedValue(mockTask)
    const result = await createTask('New Task')
    expect(apiClient.post).toHaveBeenCalledWith('/tasks', { title: 'New Task' })
    expect(result.id).toBe('2')
  })

  it('deleteTask 应删除任务', async () => {
    ;(apiClient.delete as any).mockResolvedValue(undefined)
    await deleteTask('1')
    expect(apiClient.delete).toHaveBeenCalledWith('/tasks/1')
  })
})
