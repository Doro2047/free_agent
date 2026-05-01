import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getModels, getCurrentModel, switchModel, deleteModel, renameModel, formatFileSize, extractQuantization } from '@/api/models'
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

describe('models API', () => {
  beforeEach(() => { vi.clearAllMocks() })

  describe('getModels', () => {
    it('应返回模型列表', async () => {
      const mockModels = [{ name: 'qwen-7b', size: 4096, loaded: true }]
      ;(apiClient.get as any).mockResolvedValue(mockModels)
      const result = await getModels()
      expect(apiClient.get).toHaveBeenCalledWith('/models')
      expect(result).toHaveLength(1)
    })
  })

  describe('getCurrentModel', () => {
    it('应返回当前模型', async () => {
      const mockModel = { name: 'qwen-7b', loaded: true }
      ;(apiClient.get as any).mockResolvedValue(mockModel)
      const result = await getCurrentModel()
      expect(result?.name).toBe('qwen-7b')
    })

    it('应返回 null 当无模型时', async () => {
      ;(apiClient.get as any).mockResolvedValue(null)
      const result = await getCurrentModel()
      expect(result).toBeNull()
    })
  })

  describe('switchModel', () => {
    it('应切换模型', async () => {
      ;(apiClient.post as any).mockResolvedValue({ success: true, message: 'Switched' })
      const result = await switchModel('qwen-14b')
      expect(apiClient.post).toHaveBeenCalledWith('/models/switch', { name: 'qwen-14b' })
      expect(result.success).toBe(true)
    })
  })

  describe('deleteModel', () => {
    it('应删除模型并对名称进行 URL 编码', async () => {
      ;(apiClient.delete as any).mockResolvedValue({ success: true, message: 'Deleted' })
      await deleteModel('model name with spaces')
      expect(apiClient.delete).toHaveBeenCalledWith('/models/model%20name%20with%20spaces')
    })
  })

  describe('renameModel', () => {
    it('应重命名模型并对名称进行 URL 编码', async () => {
      ;(apiClient.patch as any).mockResolvedValue({ success: true, message: 'Renamed' })
      await renameModel('old name', 'new name')
      expect(apiClient.patch).toHaveBeenCalledWith('/models/old%20name/rename', { name: 'new name' })
    })
  })

  describe('formatFileSize', () => {
    it('应格式化 0 字节', () => {
      expect(formatFileSize(0)).toBe('0 B')
    })
    it('应格式化字节', () => {
      expect(formatFileSize(512)).toBe('512.00 B')
    })
    it('应格式化 KB', () => {
      expect(formatFileSize(1024)).toBe('1.00 KB')
    })
    it('应格式化 MB', () => {
      expect(formatFileSize(1048576)).toBe('1.00 MB')
    })
    it('应格式化 GB', () => {
      expect(formatFileSize(1073741824)).toBe('1.00 GB')
    })
    it('应格式化 TB', () => {
      expect(formatFileSize(1099511627776)).toBe('1.00 TB')
    })
  })

  describe('extractQuantization', () => {
    it('应提取 Q8_0 量化', () => {
      expect(extractQuantization('model.Q8_0.gguf')).toBe('Q8_0')
    })
    it('应提取 Q4_0 量化', () => {
      expect(extractQuantization('model.Q4_0.gguf')).toBe('Q4_0')
    })
    it('应提取 F16 量化', () => {
      expect(extractQuantization('model.F16.gguf')).toBe('F16')
    })
    it('应提取 F32 量化', () => {
      expect(extractQuantization('model.F32.gguf')).toBe('F32')
    })
    it('应在无匹配时返回 GGUF', () => {
      expect(extractQuantization('model.gguf')).toBe('GGUF')
    })
  })
})
